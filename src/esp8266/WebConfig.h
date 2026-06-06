#ifndef WEBCONFIG_H
#define WEBCONFIG_H

#if defined(ESP8266)
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>
#define WebServer ESP8266WebServer
#elif defined(ESP32)
#include <WebServer.h>
#include <WiFi.h>
#endif
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

};

#endif // WEBCONFIG_H