#include "DataSender.h"
#include <ArduinoJson.h>
#include <ESP8266WiFi.h>
#include <WiFiManager.h>
#include "ConfigManager.h"
#include "OTAUpdate.h"

#ifndef FIRMWARE_VERSION
#define FIRMWARE_VERSION "1.0.0"
#endif
#ifndef BOARD_TYPE
#define BOARD_TYPE "esp32doit-devkit-v1"
#endif

extern ConfigManager configManager;

DataSender::DataSender()
    : mqttServer("167.71.207.5"), mqttPort(1883), mqttServerBackup("113.161.220.166"), mqttPortBackup(1883),
      deviceId(""), serialNumber(""), client(wifiClient), bufferIndex(0), bufferCount(0)
{
    client.setBufferSize(8192);
    client.setKeepAlive(120);
    client.setCallback([this](char *topic, byte *payload, unsigned int length)
                       { this->callback(topic, payload, length); });
}

void DataSender::setup()
{
    client.setServer(mqttServer.c_str(), mqttPort);
}

void DataSender::updateConfig(const char *mqttServer, int mqttPort, const char *mqttServerBackup, int mqttPortBackup, const char *deviceId, const char *serialNumber, const char *mqttPassword, const char *mqttUser)
{
    this->mqttServer = String(mqttServer);
    this->mqttPort = mqttPort;
    this->mqttServerBackup = String(mqttServerBackup);
    this->mqttPortBackup = mqttPortBackup;
    this->deviceId = String(deviceId);
    this->serialNumber = String(serialNumber);
    this->mqttPassword = String(mqttPassword);
    this->mqttUser = String(mqttUser);

    isUsingBackup = false;
    consecutiveFailures = 0;
    lastPrimaryCheck = millis();

    if (client.connected()) client.disconnect();
    client.setServer(this->mqttServer.c_str(), this->mqttPort);
    Serial.printf("✅ MQTT config updated: %s:%d (Backup: %s:%d), Device: %s, Serial: %s\n",
                  this->mqttServer.c_str(), this->mqttPort, this->mqttServerBackup.c_str(), this->mqttPortBackup, this->deviceId.c_str(), this->serialNumber.c_str());
}

void DataSender::loop()
{
    if (!client.connected()) reconnect();
    client.loop();
    if (isUsingBackup && client.connected())
    {
        if (millis() - lastPrimaryCheck >= 300000)
        {
            Serial.println("🔄 Checking if primary MQTT server is back online...");
            client.disconnect();
            isUsingBackup = false;
            client.setServer(mqttServer.c_str(), mqttPort);
            consecutiveFailures = 0;
            lastPrimaryCheck = millis();
        }
    }
    flushPendingOtaStatus();
    enforceOtaTimeout();
    processCompletedOta();
}

String DataSender::getTimestamp()
{
    time_t now = time(nullptr);
    struct tm *timeinfo = gmtime(&now);
    char buffer[30];
    strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
    return String(buffer);
}

bool DataSender::isConnected()
{
    return client.connected();
}

PubSubClient &DataSender::getClient()
{
    return client;
}
