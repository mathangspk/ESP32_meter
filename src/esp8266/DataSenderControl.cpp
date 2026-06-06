#include "DataSender.h"
#include <ArduinoJson.h>
#include <WiFiManager.h>
#include "ConfigManager.h"

extern ConfigManager configManager;

void DataSender::handleControlCommand(byte *payload, unsigned int length)
{
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload, length);
    if (error)
    {
        Serial.printf("deserializeJson() failed: %s\n", error.f_str());
        return;
    }

    const char *action = doc["action"] | "";
    const char *command_id = doc["command_id"] | "";
    Serial.printf("Received control command: %s (%s)\n", action, command_id);

    if (String(action) == "reboot")
    {
        Serial.println("Reboot command accepted");
        delay(500);
        ESP.restart();
        return;
    }

    if (String(action) == "factory_reset")
    {
        Serial.println("Factory reset command accepted");
        WiFiManager wifiManager;
        wifiManager.resetSettings();
        configManager.resetToDefaults();
        delay(500);
        ESP.restart();
        return;
    }

    Serial.println("Unknown control command ignored");
}
