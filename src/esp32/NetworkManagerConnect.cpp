#include "NetworkManager.h"
#include <WiFiManager.h>
#include "ConfigManager.h"
#include <LittleFS.h>

#ifndef FORCED_WIFI_SSID
#define FORCED_WIFI_SSID ""
#define FORCED_WIFI_PASSWORD ""
#endif

bool NetworkManager::connect(ConfigManager* configManager)
{
    const String forcedSsid = FORCED_WIFI_SSID;
    const String forcedPassword = FORCED_WIFI_PASSWORD;

    if (!forcedSsid.isEmpty()) {
        Serial.println("Trying forced WiFi...");
        WiFi.mode(WIFI_STA);
        WiFi.begin(forcedSsid.c_str(), forcedPassword.c_str());
        unsigned long start = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - start < 30000) {
            delay(500); Serial.print(".");
        }
        Serial.println();
        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("✅ Forced WiFi connected!");
            LittleFS.remove("/wifi_fail.txt");
            return true;
        }
        Serial.println("⚠️ Forced WiFi failed");
        WiFi.disconnect(true, true);
        delay(500);
    }

    int failCount = 0;
    if (LittleFS.exists("/wifi_fail.txt")) {
        File f = LittleFS.open("/wifi_fail.txt", "r");
        if (f) { failCount = f.readString().toInt(); f.close(); }
    }
    File f = LittleFS.open("/wifi_fail.txt", "w");
    if (f) { f.print(failCount + 1); f.close(); }
    Serial.printf("WiFi failures: %d\n", failCount + 1);

    WiFiManager wm;
    WiFiManagerParameter *custom_mqtt_server = nullptr, *custom_mqtt_port = nullptr;
    WiFiManagerParameter *custom_mqtt_user = nullptr, *custom_mqtt_pass = nullptr;
    WiFiManagerParameter *custom_device_id = nullptr, *custom_serial_number = nullptr;

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

    if (failCount + 1 > 3) {
        Serial.println("Multiple WiFi failures. Portal runs indefinitely.");
        wm.setConfigPortalTimeout(0);
    } else {
        wm.setConfigPortalTimeout(300);
    }
    wm.setConnectTimeout(30);
    String apName = "PZEM_Meter_" + WiFi.macAddress().substring(12);
    apName.replace(":", "");

    bool result = wm.autoConnect(apName.c_str());
    if (result) {
        Serial.println("✅ WiFi connected! IP: " + WiFi.localIP().toString());
        LittleFS.remove("/wifi_fail.txt");
        if (configManager != nullptr && custom_mqtt_server != nullptr) {
            auto upd = [&](const char* k, WiFiManagerParameter* p) { if (p && p->getValue()[0]) configManager->updateConfig(k, p->getValue()); };
            upd("mqtt_server", custom_mqtt_server);
            if (custom_mqtt_port && custom_mqtt_port->getValue()[0]) configManager->updateConfig("mqtt_port", String(custom_mqtt_port->getValue()).toInt());
            upd("mqtt_username", custom_mqtt_user); upd("mqtt_password", custom_mqtt_pass);
            upd("device_id", custom_device_id); upd("serial_number", custom_serial_number);
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
