#pragma once
#include <Arduino.h>
#include <PubSubClient.h>

class DataReceiver
{
public:
    DataReceiver(PubSubClient &client);
    void setup(const String &deviceId);
    void loop();
    void setOtaHandler(void (*handler)(const String &url));
    // Có thể thêm các handler khác (restart, config...)

private:
    PubSubClient &client;
    String deviceId;
    void (*otaHandler)(const String &url) = nullptr;
    void callback(char *topic, byte *payload, unsigned int length);
};