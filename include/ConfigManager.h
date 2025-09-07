#ifndef CONFIGMANAGER_H
#define CONFIGMANAGER_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <LittleFS.h>

struct MeterConfig
{
    String mqtt_server;
    int mqtt_port;
    String device_id;
    String serial_number;
    int reading_interval;
    String wifi_ssid;
    String wifi_password;
    String mqtt_username;
    String mqtt_password;
};

class ConfigManager
{
public:
    ConfigManager();

    // Khởi tạo filesystem (mount LittleFS, format nếu lỗi)
    bool initFS();

    bool loadConfig();
    bool saveConfig();

    bool updateConfig(const String &key, const String &value);
    bool updateConfig(const String &key, int value);

    MeterConfig getConfig() const;

    void printConfig() const;

    bool resetToDefaults();

    // Các getter helper
    String getMqttServer() const { return config.mqtt_server; }
    int getMqttPort() const { return config.mqtt_port; }
    String getDeviceId() const { return config.device_id; }
    String getSerialNumber() const { return config.serial_number; }
    int getReadingInterval() const { return config.reading_interval; }

private:
    MeterConfig config;

    static constexpr const char *CONFIG_FILE = "/config.json";

    void setDefaults();
};

#endif // CONFIGMANAGER_H
