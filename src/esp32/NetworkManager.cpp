#include "NetworkManager.h"
#include <WiFiManager.h>
#include "ConfigManager.h"

#ifndef FORCED_WIFI_SSID
#define FORCED_WIFI_SSID ""
#endif

#ifndef FORCED_WIFI_PASSWORD
#define FORCED_WIFI_PASSWORD ""
#endif

NetworkManager::NetworkManager() {}

bool NetworkManager::connect(ConfigManager* configManager)
{
    const String forcedSsid = FORCED_WIFI_SSID;
    const String forcedPassword = FORCED_WIFI_PASSWORD;

    if (!forcedSsid.isEmpty()) {
        Serial.println("Trying forced WiFi credentials from build flags...");
        WiFi.mode(WIFI_STA);
        WiFi.begin(forcedSsid.c_str(), forcedPassword.c_str());

        unsigned long start = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - start < 30000) {
            delay(500);
            Serial.print(".");
        }
        Serial.println();

        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("✅ Forced WiFi connection succeeded!");
            Serial.println("📶 SSID: " + WiFi.SSID());
            Serial.println("🌐 IP Address: " + WiFi.localIP().toString());
            Serial.println("🔗 Web Config: http://" + WiFi.localIP().toString());
            return true;
        }

        Serial.println("⚠️ Forced WiFi connection failed, falling back to WiFiManager");
        WiFi.disconnect(true, true);
        delay(500);
    }

    WiFiManager wm;

    // Custom parameters
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

        wm.addParameter(custom_mqtt_server);
        wm.addParameter(custom_mqtt_port);
        wm.addParameter(custom_mqtt_user);
        wm.addParameter(custom_mqtt_pass);
        wm.addParameter(custom_device_id);
        wm.addParameter(custom_serial_number);
    }

    // Cấu hình WiFiManager
    wm.setConfigPortalTimeout(180); // 3 phút timeout
    wm.setConnectTimeout(30); // 30 giây timeout kết nối

    // Tạo Access Point với tên dễ nhận biết
    String apName = "PZEM_Meter_" + WiFi.macAddress().substring(12);
    apName.replace(":", "");

    Serial.println("📡 Creating WiFi Access Point: " + apName);
    Serial.println("📱 Connect to WiFi: " + apName);
    Serial.println("🌐 Access Point IP: 192.168.4.1");
    Serial.println("🔗 Web Config URL: http://192.168.4.1");

    bool result = wm.autoConnect(apName.c_str());

    if (result) {
        Serial.println("✅ WiFi connected successfully!");
        Serial.println("📶 SSID: " + WiFi.SSID());
        Serial.println("🌐 IP Address: " + WiFi.localIP().toString());
        Serial.println("🔗 Web Config: http://" + WiFi.localIP().toString());

        // Lưu cấu hình từ các trường tuỳ biến của Captive Portal
        if (configManager != nullptr && custom_mqtt_server != nullptr) {
            String server_val = custom_mqtt_server->getValue();
            String port_val = custom_mqtt_port->getValue();
            String user_val = custom_mqtt_user->getValue();
            String pass_val = custom_mqtt_pass->getValue();
            String dev_id_val = custom_device_id->getValue();
            String ser_num_val = custom_serial_number->getValue();

            if (!server_val.isEmpty()) configManager->updateConfig("mqtt_server", server_val);
            if (!port_val.isEmpty()) configManager->updateConfig("mqtt_port", port_val.toInt());
            if (!user_val.isEmpty()) configManager->updateConfig("mqtt_username", user_val);
            if (!pass_val.isEmpty()) configManager->updateConfig("mqtt_password", pass_val);
            if (!dev_id_val.isEmpty()) configManager->updateConfig("device_id", dev_id_val);
            if (!ser_num_val.isEmpty()) configManager->updateConfig("serial_number", ser_num_val);

            configManager->saveConfig();
        }
    } else {
        Serial.println("❌ Failed to connect WiFi");
        Serial.println("🔄 Restarting...");
        ESP.restart();
    }

    // Dọn dẹp bộ nhớ các tham số tuỳ biến
    if (custom_mqtt_server != nullptr) delete custom_mqtt_server;
    if (custom_mqtt_port != nullptr) delete custom_mqtt_port;
    if (custom_mqtt_user != nullptr) delete custom_mqtt_user;
    if (custom_mqtt_pass != nullptr) delete custom_mqtt_pass;
    if (custom_device_id != nullptr) delete custom_device_id;
    if (custom_serial_number != nullptr) delete custom_serial_number;
    
    return result;
}

bool NetworkManager::isConnected()
{
    return WiFi.status() == WL_CONNECTED;
}

bool NetworkManager::reconnect(ConfigManager* configManager)
{
    if (!isConnected()) {
        Serial.println("Đang thử kết nối lại WiFi...");
        return connect(configManager);
    }
    return true;
}

bool NetworkManager::ensureConnection(ConfigManager* configManager)
{
    if (!isConnected()) {
        return reconnect(configManager);
    }
    return true;
}
