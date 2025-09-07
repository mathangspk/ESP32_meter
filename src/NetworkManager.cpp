#include "NetworkManager.h"
#include <WiFiManager.h>

NetworkManager::NetworkManager() {}

bool NetworkManager::connect()
{
    WiFiManager wm;
    
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
    } else {
        Serial.println("❌ Failed to connect WiFi");
        Serial.println("🔄 Restarting ESP8266...");
        ESP.restart();
    }
    
    return result;
}

bool NetworkManager::isConnected()
{
    return WiFi.status() == WL_CONNECTED;
}

bool NetworkManager::reconnect()
{
    if (!isConnected()) {
        Serial.println("Đang thử kết nối lại WiFi...");
        return connect();
    }
    return true;
}

bool NetworkManager::ensureConnection()
{
    if (!isConnected()) {
        return reconnect();
    }
    return true;
}