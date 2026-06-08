#include "ConfigManager.h"

namespace
{
String getIdentitySuffix()
{
    char suffix[9];
    uint32_t chipId = ESP.getChipId();
    snprintf(suffix, sizeof(suffix), "%08X", chipId);
    return String(suffix);
}
}

ConfigManager::ConfigManager()
{
    setDefaults();
}

void ConfigManager::setDefaults()
{
    config.mqtt_server = "113.161.220.166";
    config.mqtt_port = 1883;
    config.mqtt_server_backup = "167.71.207.5";
    config.mqtt_port_backup = 1883;
    config.device_id = "";
    config.serial_number = "";
    config.reading_interval = 10000;
    config.wifi_ssid = "";
    config.wifi_password = "";
    config.mqtt_username = "meterMQTT";
    config.mqtt_password = "meterMQTT";
}

String ConfigManager::buildDefaultDeviceId() const
{
    return getIdentitySuffix();
}

String ConfigManager::buildDefaultSerialNumber() const
{
    return getIdentitySuffix();
}

bool ConfigManager::shouldMigrateLegacyIdentity() const
{
    return config.device_id == "1" || config.device_id == "2" || config.device_id == "3" ||
           config.serial_number == "SN001" || config.serial_number == "SN002" || config.serial_number == "SN003";
}

void ConfigManager::ensureIdentity()
{
    if (shouldMigrateLegacyIdentity())
    {
        config.device_id = buildDefaultDeviceId();
        config.serial_number = buildDefaultSerialNumber();
        return;
    }
    if (config.device_id.isEmpty())
    {
        config.device_id = buildDefaultDeviceId();
    }
    if (config.serial_number.isEmpty())
    {
        config.serial_number = buildDefaultSerialNumber();
    }
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
    Serial.printf("  Backup MQTT Server: %s\n", config.mqtt_server_backup.c_str());
    Serial.printf("  Backup MQTT Port: %d\n", config.mqtt_port_backup);
    Serial.printf("  Device ID: %s\n", config.device_id.c_str());
    Serial.printf("  Serial Number: %s\n", config.serial_number.c_str());
    Serial.printf("  Reading Interval: %d ms\n", config.reading_interval);
    Serial.printf("  WiFi SSID: %s\n", config.wifi_ssid.c_str());
    Serial.printf("  MQTT Username: %s\n", config.mqtt_username.c_str());
}
