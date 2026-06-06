#include "ConfigManager.h"

bool ConfigManager::updateConfig(const String &key, const String &value)
{
    if (key == "mqtt_server") {
        config.mqtt_server = value;
    } else if (key == "device_id") {
        config.device_id = value;
    } else if (key == "serial_number") {
        config.serial_number = value;
    } else if (key == "wifi_ssid") {
        config.wifi_ssid = value;
    } else if (key == "wifi_password") {
        config.wifi_password = value;
    } else if (key == "mqtt_username") {
        config.mqtt_username = value;
    } else if (key == "mqtt_password") {
        config.mqtt_password = value;
    } else {
        Serial.printf("Unknown config key (String): %s\n", key.c_str());
        return false;
    }

    Serial.printf("Updated config: %s = %s\n", key.c_str(), value.c_str());
    return saveConfig();
}

bool ConfigManager::updateConfig(const String &key, int value)
{
    if (key == "mqtt_port") {
        config.mqtt_port = value;
    } else if (key == "reading_interval") {
        config.reading_interval = value;
    } else {
        Serial.printf("Unknown config key (int): %s\n", key.c_str());
        return false;
    }

    Serial.printf("Updated config: %s = %d\n", key.c_str(), value);
    return saveConfig();
}
