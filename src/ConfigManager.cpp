#include "ConfigManager.h"

ConfigManager::ConfigManager()
{
    setDefaults();
}

bool ConfigManager::initFS()
{
    if (!LittleFS.begin(true))
    { // true để format nếu mount fail
        Serial.println("Failed to mount LittleFS");
        return false;
    }
    return true;
}

void ConfigManager::setDefaults()
{
    config.mqtt_server = "113.161.220.166";
    config.mqtt_port = 1883;
    config.device_id = "1";
    config.serial_number = "SN001";
    config.reading_interval = 10000;
    config.wifi_ssid = "";
    config.wifi_password = "";
    config.mqtt_username = "mqtt";
    config.mqtt_password = "@51209267192Cvv";
}

bool ConfigManager::loadConfig()
{
    if (!initFS())
    {
        return false;
    }

    if (!LittleFS.exists(CONFIG_FILE))
    {
        Serial.println("Config file not found, creating default config");
        return saveConfig();
    }

    File file = LittleFS.open(CONFIG_FILE, "r");
    if (!file)
    {
        Serial.println("Failed to open config file");
        return false;
    }

    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    if (error)
    {
        Serial.printf("Failed to parse config file: %s\n", error.c_str());
        return false;
    }

    // Load config từ JSON, dùng toán tử | để fallback mặc định
    config.mqtt_server = doc["mqtt_server"] | config.mqtt_server;
    config.mqtt_port = doc["mqtt_port"] | config.mqtt_port;
    config.device_id = doc["device_id"] | config.device_id;
    config.serial_number = doc["serial_number"] | config.serial_number;
    config.reading_interval = doc["reading_interval"] | config.reading_interval;
    config.wifi_ssid = doc["wifi_ssid"] | config.wifi_ssid;
    config.wifi_password = doc["wifi_password"] | config.wifi_password;
    config.mqtt_username = doc["mqtt_username"] | config.mqtt_username;
    config.mqtt_password = doc["mqtt_password"] | config.mqtt_password;

    Serial.println("Config loaded successfully");
    printConfig();
    return true;
}

bool ConfigManager::saveConfig()
{
    if (!initFS())
    {
        return false;
    }

    File file = LittleFS.open(CONFIG_FILE, "w");
    if (!file)
    {
        Serial.println("Failed to create config file");
        return false;
    }

    StaticJsonDocument<1024> doc;
    doc["mqtt_server"] = config.mqtt_server;
    doc["mqtt_port"] = config.mqtt_port;
    doc["device_id"] = config.device_id;
    doc["serial_number"] = config.serial_number;
    doc["reading_interval"] = config.reading_interval;
    doc["wifi_ssid"] = config.wifi_ssid;
    doc["wifi_password"] = config.wifi_password;
    doc["mqtt_username"] = config.mqtt_username;
    doc["mqtt_password"] = config.mqtt_password;

    if (serializeJson(doc, file) == 0)
    {
        Serial.println("Failed to write config file");
        file.close();
        return false;
    }

    file.close();
    Serial.println("Config saved successfully");
    return true;
}

bool ConfigManager::updateConfig(const String &key, const String &value)
{
    if (key == "mqtt_server")
    {
        config.mqtt_server = value;
    }
    else if (key == "device_id")
    {
        config.device_id = value;
    }
    else if (key == "serial_number")
    {
        config.serial_number = value;
    }
    else if (key == "wifi_ssid")
    {
        config.wifi_ssid = value;
    }
    else if (key == "wifi_password")
    {
        config.wifi_password = value;
    }
    else if (key == "mqtt_username")
    {
        config.mqtt_username = value;
    }
    else if (key == "mqtt_password")
    {
        config.mqtt_password = value;
    }
    else
    {
        Serial.printf("Unknown config key (String): %s\n", key.c_str());
        return false;
    }

    Serial.printf("Updated config: %s = %s\n", key.c_str(), value.c_str());
    return saveConfig();
}

bool ConfigManager::updateConfig(const String &key, int value)
{
    if (key == "mqtt_port")
    {
        config.mqtt_port = value;
    }
    else if (key == "reading_interval")
    {
        config.reading_interval = value;
    }
    else
    {
        Serial.printf("Unknown config key (int): %s\n", key.c_str());
        return false;
    }

    Serial.printf("Updated config: %s = %d\n", key.c_str(), value);
    return saveConfig();
}

MeterConfig ConfigManager::getConfig() const
{
    return config;
}

void ConfigManager::printConfig() const
{
    Serial.println("Current Configuration:");
    Serial.printf("  MQTT Server: %s\n", config.mqtt_server.c_str());
    Serial.printf("  MQTT Port: %d\n", config.mqtt_port);
    Serial.printf("  Device ID: %s\n", config.device_id.c_str());
    Serial.printf("  Serial Number: %s\n", config.serial_number.c_str());
    Serial.printf("  Reading Interval: %d ms\n", config.reading_interval);
    Serial.printf("  WiFi SSID: %s\n", config.wifi_ssid.c_str());
    Serial.printf("  MQTT Username: %s\n", config.mqtt_username.c_str());
}

bool ConfigManager::resetToDefaults()
{
    setDefaults();
    return saveConfig();
}
