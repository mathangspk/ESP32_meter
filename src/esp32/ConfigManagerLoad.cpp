#include "ConfigManager.h"

bool ConfigManager::initFS()
{
    if (!LittleFS.begin(true)) {
        Serial.println("Failed to mount LittleFS");
        return false;
    }
    return true;
}

bool ConfigManager::loadConfig()
{
    if (!initFS()) return false;
    if (!LittleFS.exists(CONFIG_FILE)) {
        ensureIdentity();
        Serial.println("Config file not found, creating default config");
        return saveConfig();
    }
    File file = LittleFS.open(CONFIG_FILE, "r");
    if (!file) {
        Serial.println("Failed to open config file");
        return false;
    }
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();
    if (error) {
        Serial.printf("Failed to parse config file: %s\n", error.c_str());
        setDefaults();
        ensureIdentity();
        return saveConfig();
    }
    config.mqtt_server = doc["mqtt_server"] | config.mqtt_server;
    config.mqtt_port = doc["mqtt_port"] | config.mqtt_port;
    config.mqtt_server_backup = doc["mqtt_server_backup"] | config.mqtt_server_backup;
    config.mqtt_port_backup = doc["mqtt_port_backup"] | config.mqtt_port_backup;
    config.device_id = doc["device_id"] | config.device_id;
    config.serial_number = doc["serial_number"] | config.serial_number;
    config.reading_interval = doc["reading_interval"] | config.reading_interval;
    config.wifi_ssid = doc["wifi_ssid"] | config.wifi_ssid;
    config.wifi_password = doc["wifi_password"] | config.wifi_password;
    config.mqtt_username = doc["mqtt_username"] | config.mqtt_username;
    config.mqtt_password = doc["mqtt_password"] | config.mqtt_password;

    bool shouldMigrateCredentials = (config.mqtt_username == "mqtt" && (config.mqtt_password == "@51209267192Cvv" || config.mqtt_password == "-------------"));
    if (shouldMigrateCredentials) {
        Serial.println("Migrating legacy MQTT credentials");
        config.mqtt_username = "meterMQTT";
        config.mqtt_password = "meterMQTT";
    }
    bool shouldRewriteIdentity = shouldMigrateLegacyIdentity() || config.device_id.isEmpty() || config.serial_number.isEmpty() || shouldMigrateCredentials;
    ensureIdentity();
    if (shouldRewriteIdentity) {
        Serial.println("Persisting updated identity/credentials");
        saveConfig();
    }
    Serial.println("Config loaded successfully");
    printConfig();
    return true;
}
