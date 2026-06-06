#include "ConfigManager.h"

bool ConfigManager::initFS()
{
    if (LittleFS.begin()) return true;
    Serial.println("Failed to mount LittleFS. Formatting...");
    if (LittleFS.format() && LittleFS.begin()) return true;
    Serial.println("Failed to format and mount LittleFS");
    return false;
}

bool ConfigManager::loadConfig()
{
    if (!initFS()) return false;
    if (!LittleFS.exists(CONFIG_FILE)) {
        ensureIdentity();
        return saveConfig();
    }
    File file = LittleFS.open(CONFIG_FILE, "r");
    if (!file) return false;
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();
    if (error) {
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

    bool migrate = (config.mqtt_username == "mqtt" && (config.mqtt_password == "@51209267192Cvv" || config.mqtt_password == "-------------"));
    if (migrate) {
        config.mqtt_username = "meterMQTT";
        config.mqtt_password = "meterMQTT";
    }
    bool rewrite = shouldMigrateLegacyIdentity() || config.device_id.isEmpty() || config.serial_number.isEmpty() || migrate;
    ensureIdentity();
    if (rewrite) saveConfig();
    printConfig();
    return true;
}
