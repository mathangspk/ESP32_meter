#ifndef WEBCONFIG_H
#define WEBCONFIG_H

#include <Arduino.h>
#include <WebServer.h>
#include <WiFi.h>
#include "ConfigManager.h"

class WebConfig
{
public:
    WebConfig(ConfigManager &configManager);
    void begin();
    void handle();
    void startConfigPortal();
    void stopConfigPortal();
    bool isConfigPortalActive();

private:
    WebServer server;
    ConfigManager &configManager;
    bool configPortalActive;

    void handleRoot();
    void handleConfig();
    void handleSaveConfig();
    void handleReset();
    void handleStatus();
    void handleReboot();
    void handleIP();

    String getConfigHTML();
    String getStatusHTML();
};

#endif // WEBCONFIG_H