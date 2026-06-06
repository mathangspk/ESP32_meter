#include "ConfigManager.h"

bool ConfigManager::saveConfig()
{
    if (!initFS()) return false;
    File file = LittleFS.open(CONFIG_FILE, "w");
    if (!file) return false;
    StaticJsonDocument<1024> doc;
    doc["mqtt_server"] = config.mqtt_server;
    doc["mqtt_port"] = config.mqtt_port;
    doc["mqtt_server_backup"] = config.mqtt_server_backup;
    doc["mqtt_port_backup"] = config.mqtt_port_backup;
    doc["device_id"] = config.device_id;
    doc["serial_number"] = config.serial_number;
    doc["reading_interval"] = config.reading_interval;
    doc["wifi_ssid"] = config.wifi_ssid;
    doc["wifi_password"] = config.wifi_password;
    doc["mqtt_username"] = config.mqtt_username;
    doc["mqtt_password"] = config.mqtt_password;
    if (serializeJson(doc, file) == 0) {
        file.close();
        return false;
    }
    file.close();
    return true;
}

bool ConfigManager::resetToDefaults()
{
    String preservedDeviceId = config.device_id;
    String preservedSerialNumber = config.serial_number;
    setDefaults();
    config.device_id = preservedDeviceId;
    config.serial_number = preservedSerialNumber;
    ensureIdentity();
    return saveConfig();
}
