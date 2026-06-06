#include "DataSender.h"
#include <ArduinoJson.h>
#include <WiFi.h>
#include "OTAUpdate.h"

#ifndef FIRMWARE_VERSION
#define FIRMWARE_VERSION "1.0.0"
#endif

void DataSender::flushPendingOtaStatus()
{
    if (!hasPendingOtaStatus || !client.connected()) return;
    PendingOtaStatus pending = pendingOtaStatus;
    hasPendingOtaStatus = false;
    publishOtaStatus(pending.jobId, pending.status, pending.message, pending.targetVersion);
}

void DataSender::processCompletedOta()
{
    if (!otaResultReady) return;
    otaResultReady = false; otaTaskRunning = false; otaTaskHandle = nullptr; otaStartedAt = 0;

    switch (otaTaskResult)
    {
    case OtaUpdateResult::Success:
        publishOtaStatus(otaJobId, "success", otaResultMessage, otaTargetVersion);
        delay(500); ESP.restart(); break;
    case OtaUpdateResult::NoUpdate:
        publishOtaStatus(otaJobId, "success", otaResultMessage, otaTargetVersion); break;
    case OtaUpdateResult::UrlUnavailable:
    case OtaUpdateResult::Failed:
        publishOtaStatus(otaJobId, "failed", otaResultMessage, otaTargetVersion); break;
    }
}

void DataSender::enforceOtaTimeout()
{
    if (!otaTaskRunning || otaTaskHandle == nullptr) return;
    if (millis() - otaStartedAt < OTA_TIMEOUT_MS) return;

    Serial.println("OTA timed out, stopping stuck OTA task");
    vTaskDelete(otaTaskHandle);
    otaTaskHandle = nullptr; otaTaskRunning = false; otaResultReady = false;
    otaResultMessage = "OTA timed out while downloading";
    publishOtaStatus(otaJobId, "failed", otaResultMessage, otaTargetVersion);
    otaStartedAt = 0;
}

void DataSender::otaTaskEntry(void *parameter)
{
    OtaTaskContext *context = static_cast<OtaTaskContext *>(parameter);
    String message;
    OtaUpdateResult result = handleOtaUpdate(context->url, message);

    context->sender->otaTaskResult = result;
    context->sender->otaResultMessage = message;
    context->sender->otaResultReady = true;
    context->sender->otaTaskHandle = nullptr;

    delete context;
    vTaskDelete(nullptr);
}

void DataSender::publishOtaStatus(const String &jobId, const String &status, const String &message, const String &targetVersion)
{
    if (!client.connected())
    {
        pendingOtaStatus = PendingOtaStatus{jobId, status, message, targetVersion};
        hasPendingOtaStatus = true;
        Serial.println("Cannot publish OTA status now: MQTT not connected, deferring");
        return;
    }

    StaticJsonDocument<512> doc;
    doc["job_id"] = jobId;
    doc["device_id"] = deviceId;
    doc["serial_number"] = serialNumber;
    doc["status"] = status;
    doc["message"] = message;
    doc["current_version"] = FIRMWARE_VERSION;
    doc["target_version"] = targetVersion;
    doc["timestamp"] = getTimestamp();

    String payload;
    serializeJson(doc, payload);

    String topic = "meter/" + deviceId + "/ota/status";
    if (client.publish(topic.c_str(), payload.c_str()))
    {
        Serial.printf("OTA status published: %s\n", payload.c_str());
    }
    else
    {
        Serial.println("Failed to publish OTA status");
    }
}
