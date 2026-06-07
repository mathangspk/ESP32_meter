#include "NetworkManager.h"
#include <WiFi.h>
#include <WiFiManager.h>
#include "ConfigManager.h"

NetworkManager::NetworkManager() {}

bool NetworkManager::isConnected()
{
    return WiFi.status() == WL_CONNECTED;
}

bool NetworkManager::reconnect(ConfigManager* configManager)
{
    if (!isConnected()) {
        Serial.println("Đang thử kết nối lại WiFi (non-blocking)...");
        WiFi.begin();
        return false;
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
