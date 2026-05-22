#ifndef DATASENDER_H
#define DATASENDER_H

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <PubSubClient.h>
#include <WiFiClient.h>
#include "types/DataTypes.h"
#include "OTAUpdate.h"

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
    PubSubClient &getClient();

private:
    struct PendingOtaStatus
    {
        String jobId;
        String status;
        String message;
        String targetVersion;
    };

    struct OtaTaskContext
    {
        DataSender *sender;
        String url;
    };

    void reconnect();
    void processCompletedOta();
    void flushPendingOtaStatus();
    void enforceOtaTimeout();
    String getTimestamp();
    String createPayload(String serial_number, float voltage, float current, float power, float energy, String IPAddress);
    void callback(char *topic, byte *payload, unsigned int length);
    void publishOtaStatus(const String &jobId, const String &status, const String &message, const String &targetVersion);
    static void otaTaskEntry(void *parameter);

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

    volatile bool otaTaskRunning = false;
    volatile bool otaResultReady = false;
    OtaUpdateResult otaTaskResult = OtaUpdateResult::Failed;
    TaskHandle_t otaTaskHandle = nullptr;
    String otaJobId;
    String otaTargetVersion;
    String otaResultMessage;
    bool hasPendingOtaStatus = false;
    PendingOtaStatus pendingOtaStatus;
    unsigned long otaStartedAt = 0;

    unsigned long lastReconnectAttempt = 0;
    const unsigned long RECONNECT_INTERVAL = 5000; // 5 seconds
    const unsigned long OTA_TIMEOUT_MS = 45000;
};

#endif // DATASENDER_H
