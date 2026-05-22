#ifndef NETWORKMANAGER_H
#define NETWORKMANAGER_H

#include <Arduino.h>
#include <WiFiManager.h>

class NetworkManager
{
public:
    NetworkManager();
    bool connect();
    bool isConnected();
    bool reconnect();
    bool ensureConnection();
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