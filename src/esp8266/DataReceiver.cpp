#include "DataReceiver.h"
#include <ArduinoJson.h>
DataReceiver::DataReceiver(PubSubClient &client) : client(client) {}

void DataReceiver::setup(const String &deviceId)
{
    this->deviceId = deviceId;
    Serial.printf("✅ DataReceiver initialized for device ID: %s\n", deviceId.c_str());
    String controlTopic = "meter/" + deviceId + "/control";
    String testTopic = "firmware/test/device/" + deviceId;
    client.setCallback([this](char *topic, byte *payload, unsigned int length)
                       { this->callback(topic, payload, length); });
    client.subscribe(controlTopic.c_str());
    client.subscribe(testTopic.c_str()); // Thêm dòng này để nhận test topic
}

void DataReceiver::loop()
{
    // Nếu cần xử lý gì thêm
}

void DataReceiver::setOtaHandler(void (*handler)(const String &url))
{
    otaHandler = handler;
}

void DataReceiver::callback(char *topic, byte *payload, unsigned int length)
{
    String message;
    for (unsigned int i = 0; i < length; i++)
        message += (char)payload[i];
    String topicStr(topic);

    // Hiển thị thông tin nhận được
    Serial.println("=== MQTT MESSAGE RECEIVED ===");
    Serial.println("Topic: " + topicStr);
    Serial.println("Payload: " + message);
    Serial.println("============================");

    // Xử lý các lệnh khác nếu cần
    // ...
}