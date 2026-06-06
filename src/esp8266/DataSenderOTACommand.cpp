#include "DataSender.h"
#include <ArduinoJson.h>

void DataSender::handleOtaCommand(byte *payload, unsigned int length)
{
    const size_t docCapacity = length + 2048;
    DynamicJsonDocument doc(docCapacity);
    DeserializationError error = deserializeJson(doc, payload, length);
    if (error)
    {
        Serial.printf("deserializeJson() failed: %s\n", error.f_str());
        return;
    }

    String otaUrl = doc["url"].as<String>();
    if (otaUrl.isEmpty()) otaUrl = doc["OTAurl"].as<String>();
    String jobId = doc["job_id"].as<String>();
    String targetVersion = doc["version"].as<String>();

    if (otaTaskRunning)
    {
        publishOtaStatus(jobId, "failed", "OTA already in progress", targetVersion);
        return;
    }

    Serial.println("Received OTA update command");
    publishOtaStatus(jobId, "received", "OTA command received", targetVersion);

    if (!otaUrl.isEmpty() && otaUrl.startsWith("http"))
    {
        Serial.printf("Starting OTA update from URL: %s\n", otaUrl.c_str());
        publishOtaStatus(jobId, "downloading", "Firmware download started", targetVersion);

        otaJobId = jobId;
        otaTargetVersion = targetVersion;
        otaResultMessage = "";
        otaTaskRunning = true;
        otaResultReady = false;
        otaStartedAt = millis();

        OtaTaskContext *context = new OtaTaskContext{this, otaUrl};
        otaTaskEntry(context);
    }
    else
    {
        Serial.println("Invalid OTA URL received!");
        publishOtaStatus(jobId, "failed", "Invalid OTA URL", targetVersion);
    }
}
