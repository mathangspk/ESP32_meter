#ifndef DATASENDER_H
#define DATASENDER_H

#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFiClient.h>
#include "types/DataTypes.h"

class DataSender
{
public:
    DataSender();
    void setup();
    void loop();
    void sendData(float voltage, float current, float power, float energy, String IPAddress);
    void sendBufferedData();
    void addToBuffer(float voltage, float current, float power, float energy, String IPAddress);
    bool isConnected();
    void updateConfig(const char *mqttServer, int mqttPort, const char *deviceId, const char *serialNumber, const char *mqttPassword, const char *mqttUser); // sửa hàm này

private:
    void reconnect();
    String getTimestamp();
    String createPayload(String serial_number, float voltage, float current, float power, float energy, String IPAddress);
    void callback(char *topic, byte *payload, unsigned int length);

    String mqttServer;
    int mqttPort;
    String deviceId;
    String serialNumber;
    String mqttPassword; // thêm thuộc tính này
    String mqttUser;     // thêm thuộc tính này
    // thêm thuộc tính này
    WiFiClient wifiClient;
    PubSubClient client;

    static const int BUFFER_SIZE = 10;
    struct BufferedData
    {
        float voltage;
        float current;
        float power;
        float energy;
        String IPAddress;
        unsigned long timestamp;
    };
    BufferedData dataBuffer[BUFFER_SIZE];
    int bufferIndex;
    int bufferCount;

    unsigned long lastReconnectAttempt = 0;
    const unsigned long RECONNECT_INTERVAL = 5000; // 5 seconds
};

#endif // DATASENDER_H