#include "NetworkManager.h"
#include <WiFiManager.h>
#include "ConfigManager.h"

#ifndef FORCED_WIFI_SSID
#define FORCED_WIFI_SSID ""
#endif
#ifndef FORCED_WIFI_PASSWORD
#define FORCED_WIFI_PASSWORD ""
#endif

bool NetworkManager::connect(ConfigManager* configManager)
{
    const String forcedSsid = FORCED_WIFI_SSID;
    const String forcedPassword = FORCED_WIFI_PASSWORD;

    if (!forcedSsid.isEmpty()) {
        Serial.println("Trying forced WiFi from build flags...");
        WiFi.mode(WIFI_STA);
        WiFi.begin(forcedSsid.c_str(), forcedPassword.c_str());
        unsigned long start = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - start < 30000) {
            delay(500);
            Serial.print(".");
        }
        Serial.println();
        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("✅ Forced WiFi connected!");
            return true;
        }
        Serial.println("⚠️ Forced WiFi connection failed");
        WiFi.disconnect(true, true);
        delay(500);
    }

    WiFiManager wm;
    WiFiManagerParameter* custom_mqtt_server = nullptr;
    WiFiManagerParameter* custom_mqtt_port = nullptr;
    WiFiManagerParameter* custom_mqtt_user = nullptr;
    WiFiManagerParameter* custom_mqtt_pass = nullptr;
    WiFiManagerParameter* custom_device_id = nullptr;
    WiFiManagerParameter* custom_serial_number = nullptr;

    if (configManager != nullptr) {
        custom_mqtt_server = new WiFiManagerParameter("server", "MQTT Server", configManager->getMqttServer().c_str(), 40);
        custom_mqtt_port = new WiFiManagerParameter("port", "MQTT Port", String(configManager->getMqttPort()).c_str(), 6);
        custom_mqtt_user = new WiFiManagerParameter("user", "MQTT Username", configManager->getConfig().mqtt_username.c_str(), 40);
        custom_mqtt_pass = new WiFiManagerParameter("pass", "MQTT Password", configManager->getConfig().mqtt_password.c_str(), 40);
        custom_device_id = new WiFiManagerParameter("device_id", "Device ID (optional)", configManager->getDeviceId().c_str(), 40);
        custom_serial_number = new WiFiManagerParameter("serial_number", "Serial Number (optional)", configManager->getSerialNumber().c_str(), 40);

        wm.addParameter(custom_mqtt_server); wm.addParameter(custom_mqtt_port);
        wm.addParameter(custom_mqtt_user); wm.addParameter(custom_mqtt_pass);
        wm.addParameter(custom_device_id); wm.addParameter(custom_serial_number);
    }

    wm.setConfigPortalTimeout(180);
    wm.setConnectTimeout(30);
    String apName = "PZEM_Meter_" + WiFi.macAddress().substring(12);
    apName.replace(":", "");

    bool result = wm.autoConnect(apName.c_str());
    if (result) {
        Serial.println("✅ WiFi connected! IP: " + WiFi.localIP().toString());
        if (configManager != nullptr && custom_mqtt_server != nullptr) {
            if (custom_mqtt_server->getValue()[0] != '\0') configManager->updateConfig("mqtt_server", custom_mqtt_server->getValue());
            if (custom_mqtt_port->getValue()[0] != '\0') configManager->updateConfig("mqtt_port", String(custom_mqtt_port->getValue()).toInt());
            if (custom_mqtt_user->getValue()[0] != '\0') configManager->updateConfig("mqtt_username", custom_mqtt_user->getValue());
            if (custom_mqtt_pass->getValue()[0] != '\0') configManager->updateConfig("mqtt_password", custom_mqtt_pass->getValue());
            if (custom_device_id->getValue()[0] != '\0') configManager->updateConfig("device_id", custom_device_id->getValue());
            if (custom_serial_number->getValue()[0] != '\0') configManager->updateConfig("serial_number", custom_serial_number->getValue());
            configManager->saveConfig();
        }
    } else {
        Serial.println("❌ Failed WiFi. Restarting...");
        ESP.restart();
    }

    delete custom_mqtt_server; delete custom_mqtt_port;
    delete custom_mqtt_user; delete custom_mqtt_pass;
    delete custom_device_id; delete custom_serial_number;
    return result;
}
