#ifndef NETWORKMANAGER_H
#define NETWORKMANAGER_H

#include <Arduino.h>
#include <WiFiManager.h>

class ConfigManager; // Forward declaration

class NetworkManager
{
public:
    NetworkManager();
    bool connect(ConfigManager* configManager = nullptr);
    bool isConnected();
    bool reconnect(ConfigManager* configManager = nullptr);
    bool ensureConnection(ConfigManager* configManager = nullptr);
    int getWifiReconnectAttempts() const { return wifiReconnectAttempts; }
    void incrementWifiReconnectAttempts() { wifiReconnectAttempts++; }
    void resetWifiReconnectAttempts() { wifiReconnectAttempts = 0; }
    int getMaxWifiReconnectAttempts() const { return maxWifiReconnectAttempts; }

private:
    int wifiReconnectAttempts = 0;
    const int maxWifiReconnectAttempts = 5;
    WiFiManager wm;
};

#endif // NETWORKMANAGER_H