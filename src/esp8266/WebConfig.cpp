#include "WebConfig.h"
#include "WebConfigHTML.h"
#include "WebConfigHTMLStatus.h"

WebConfig::WebConfig(ConfigManager &configManager)
    : server(80), configManager(configManager), configPortalActive(false)
{
}

void WebConfig::begin()
{
    server.on("/", HTTP_GET, [this]() { handleRoot(); });
    server.on("/config", HTTP_GET, [this]() { handleConfig(); });
    server.on("/config", HTTP_POST, [this]() { handleSaveConfig(); });
    server.on("/reset", HTTP_POST, [this]() { handleReset(); });
    server.on("/status", HTTP_GET, [this]() { handleStatus(); });
    server.on("/reboot", HTTP_POST, [this]() { handleReboot(); });
    server.on("/ip", HTTP_GET, [this]() { handleIP(); });

    server.begin();
    Serial.println("Web config server started on port 80");
}

void WebConfig::handle()
{
    server.handleClient();
}

void WebConfig::startConfigPortal()
{
    configPortalActive = true;
    Serial.println("Config portal activated");
}

void WebConfig::stopConfigPortal()
{
    configPortalActive = false;
    Serial.println("Config portal deactivated");
}

bool WebConfig::isConfigPortalActive()
{
    return configPortalActive;
}

void WebConfig::handleRoot()
{
    server.send(200, "text/html", getRootHTML(WiFi.SSID(), WiFi.localIP().toString(), WiFi.macAddress()));
}

void WebConfig::handleConfig()
{
    MeterConfig config = configManager.getConfig();
    server.send(200, "text/html", getConfigHTML(config.mqtt_server, config.mqtt_port, config.device_id, config.serial_number, config.mqtt_username, config.mqtt_password, config.reading_interval));
}

void WebConfig::handleSaveConfig()
{
    if (server.hasArg("mqtt_server")) configManager.updateConfig("mqtt_server", server.arg("mqtt_server"));
    if (server.hasArg("mqtt_port")) configManager.updateConfig("mqtt_port", server.arg("mqtt_port").toInt());
    if (server.hasArg("device_id")) configManager.updateConfig("device_id", server.arg("device_id"));
    if (server.hasArg("serial_number")) configManager.updateConfig("serial_number", server.arg("serial_number"));
    if (server.hasArg("mqtt_user")) configManager.updateConfig("mqtt_username", server.arg("mqtt_user"));
    if (server.hasArg("mqtt_password")) configManager.updateConfig("mqtt_password", server.arg("mqtt_password"));
    if (server.hasArg("reading_interval")) configManager.updateConfig("reading_interval", server.arg("reading_interval").toInt());

    server.send(200, "text/html", getSaveConfigHTML());
}

void WebConfig::handleReset()
{
    configManager.resetToDefaults();
    server.send(200, "text/html", getResetHTML());
}

void WebConfig::handleStatus()
{
    MeterConfig config = configManager.getConfig();
    server.send(200, "text/html", getStatusHTML(WiFi.SSID(), WiFi.localIP().toString(), config.mqtt_server, config.mqtt_port, config.device_id, config.serial_number, config.reading_interval, millis() / 1000, ESP.getFreeHeap()));
}

void WebConfig::handleReboot()
{
    server.send(200, "text/html", getRebootHTML());
    delay(1000);
    ESP.restart();
}

void WebConfig::handleIP()
{
    server.send(200, "text/html", getIPHTML(WiFi.localIP().toString(), WiFi.SSID(), WiFi.gatewayIP().toString(), WiFi.subnetMask().toString(), WiFi.dnsIP().toString(), WiFi.macAddress()));
}