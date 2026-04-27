#include "DataSender.h"
#include <ArduinoJson.h>
#include <WiFi.h>
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
    : mqttServer("113.161.220.166"), mqttPort(1883), deviceId("5"), serialNumber("SN005"),
      client(wifiClient), bufferIndex(0), bufferCount(0)
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

void DataSender::updateConfig(const char *mqttServer, int mqttPort, const char *deviceId, const char *serialNumber, const char *mqttPassword, const char *mqttUser)
{
    this->mqttServer = String(mqttServer);
    this->mqttPort = mqttPort;
    this->deviceId = String(deviceId);
    this->serialNumber = String(serialNumber);
    this->mqttPassword = String(mqttPassword);
    this->mqttUser = String(mqttUser);

    if (client.connected())
    {
        client.disconnect();
    }
    client.setServer(this->mqttServer.c_str(), this->mqttPort);

    Serial.printf("✅ MQTT config updated: %s:%d, Device: %s, Serial: %s\n",
                  this->mqttServer.c_str(), this->mqttPort, this->deviceId.c_str(), this->serialNumber.c_str());
}

void DataSender::loop()
{
    if (!client.connected())
    {
        reconnect();
    }
    client.loop();
    flushPendingOtaStatus();
    enforceOtaTimeout();
    processCompletedOta();
}

void DataSender::flushPendingOtaStatus()
{
    if (!hasPendingOtaStatus || !client.connected())
    {
        return;
    }

    PendingOtaStatus pending = pendingOtaStatus;
    hasPendingOtaStatus = false;
    publishOtaStatus(pending.jobId, pending.status, pending.message, pending.targetVersion);
}

void DataSender::processCompletedOta()
{
    if (!otaResultReady)
    {
        return;
    }

    otaResultReady = false;
    otaTaskRunning = false;
    otaTaskHandle = nullptr;
    otaStartedAt = 0;

    switch (otaTaskResult)
    {
    case OtaUpdateResult::Success:
        publishOtaStatus(otaJobId, "success", otaResultMessage, otaTargetVersion);
        delay(500);
        ESP.restart();
        break;
    case OtaUpdateResult::NoUpdate:
        publishOtaStatus(otaJobId, "success", otaResultMessage, otaTargetVersion);
        break;
    case OtaUpdateResult::UrlUnavailable:
    case OtaUpdateResult::Failed:
        publishOtaStatus(otaJobId, "failed", otaResultMessage, otaTargetVersion);
        break;
    }
}

void DataSender::enforceOtaTimeout()
{
    if (!otaTaskRunning || otaTaskHandle == nullptr)
    {
        return;
    }

    unsigned long elapsed = millis() - otaStartedAt;
    if (elapsed < OTA_TIMEOUT_MS)
    {
        return;
    }

    Serial.println("OTA timed out, stopping stuck OTA task");
    vTaskDelete(otaTaskHandle);
    otaTaskHandle = nullptr;
    otaTaskRunning = false;
    otaResultReady = false;
    otaResultMessage = "OTA timed out while downloading";
    publishOtaStatus(otaJobId, "failed", otaResultMessage, otaTargetVersion);
    otaStartedAt = 0;
}

void DataSender::reconnect()
{
    unsigned long now = millis();
    if (now - lastReconnectAttempt < RECONNECT_INTERVAL)
    {
        return;
    }
    lastReconnectAttempt = now;

    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP8266Client-";
    clientId += String(random(0xffff), HEX);
    Serial.printf("Client ID: %s\n", clientId.c_str());
    Serial.printf("MQTT Server: %s, Port: %d, User: %s, Password: %s\n",
                  mqttServer.c_str(), mqttPort, mqttUser.c_str(), mqttPassword.c_str());
    // Attempt to connect
    if (client.connect(clientId.c_str(), mqttUser.c_str(), mqttPassword.c_str()))
    {
        Serial.println("connected");

        // Subscribe to control topics
        String controlTopic = "meter/" + String(deviceId) + "/control";
        client.subscribe(controlTopic.c_str());
        Serial.print("Subscribed to: ");
        Serial.println(controlTopic);

        // Thêm subscribe cho topic test
        String testTopic = "firmwareUpdateOTA/device/" + String(serialNumber);
        client.subscribe(testTopic.c_str());
        Serial.print("Subscribed to: ");
        Serial.println(testTopic);
        flushPendingOtaStatus();
        // Send buffered data if any
        sendBufferedData();
    }
    else
    {
        Serial.print("failed, rc=");
        Serial.print(client.state());
        Serial.println(" retrying in 5 seconds");
    }
}

void DataSender::callback(char *topic, byte *payload, unsigned int length)
{
    String expectedTopic = "firmwareUpdateOTA/device/" + String(serialNumber);
    String controlTopic = "meter/" + String(deviceId) + "/control";

    Serial.print("Message arrived [");
    Serial.print(topic);
    Serial.print("] ");

    if (String(topic) == controlTopic)
    {
        String message;
        for (unsigned int i = 0; i < length; i++)
        {
            message += (char)payload[i];
        }
        Serial.println(message);

        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, payload, length);
        if (error)
        {
            Serial.print("deserializeJson() failed: ");
            Serial.println(error.f_str());
            return;
        }

        const char *action = doc["action"] | "";
        const char *command_id = doc["command_id"] | "";
        Serial.printf("Received control command: %s (%s)\n", action, command_id);

        if (String(action) == "reboot")
        {
            Serial.println("Reboot command accepted");
            delay(500);
            ESP.restart();
            return;
        }

        if (String(action) == "factory_reset")
        {
            Serial.println("Factory reset command accepted");
            WiFiManager wifiManager;
            wifiManager.resetSettings();
            configManager.resetToDefaults();
            delay(500);
            ESP.restart();
            return;
        }

        Serial.println("Unknown control command ignored");
        return;
    }

    if (String(topic) == expectedTopic)
    {
        String message;
        for (unsigned int i = 0; i < length; i++)
        {
            message += (char)payload[i];
        }
        Serial.println(message);

        const size_t docCapacity = length + 2048;
        DynamicJsonDocument doc(docCapacity);
        DeserializationError error = deserializeJson(doc, payload, length);
        if (error)
        {
            Serial.print("deserializeJson() failed: ");
            Serial.println(error.f_str());
            return;
        }

        String otaUrl = doc["url"].as<String>();
        if (otaUrl.isEmpty())
        {
            otaUrl = doc["OTAurl"].as<String>();
        }
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
            if (xTaskCreatePinnedToCore(DataSender::otaTaskEntry, "otaUpdate", 16384, context, 1, &otaTaskHandle, 1) != pdPASS)
            {
                otaTaskRunning = false;
                otaTaskHandle = nullptr;
                otaStartedAt = 0;
                delete context;
                publishOtaStatus(jobId, "failed", "Failed to start OTA task", targetVersion);
            }
        }
        else
        {
            Serial.println("Invalid OTA URL received!");
            publishOtaStatus(jobId, "failed", "Invalid OTA URL", targetVersion);
        }
    }
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
        Serial.println("Cannot publish OTA status now: MQTT not connected, deferring until reconnect");
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

void DataSender::sendData(float voltage, float current, float power, float energy, String IPAddress)
{
    if (client.connected())
    {
        String topic = "meter/" + String(deviceId) + "/data";
        String payload = createPayload(serialNumber, voltage, current, power, energy, IPAddress);

        if (client.publish(topic.c_str(), payload.c_str()))
        {
            Serial.printf("Data sent to MQTT: %s\n", payload.c_str());
            sendBufferedData();
        }
        else
        {
            Serial.println("Failed to publish to MQTT!");
            addToBuffer(voltage, current, power, energy, IPAddress);
        }
    }
    else
    {
        Serial.println("No MQTT connection! Lưu dữ liệu vào buffer...");
        addToBuffer(voltage, current, power, energy, IPAddress);
    }
}

void DataSender::addToBuffer(float voltage, float current, float power, float energy, String IPAddress)
{
    if (bufferCount < BUFFER_SIZE)
    {
        dataBuffer[bufferIndex].voltage = voltage;
        dataBuffer[bufferIndex].current = current;
        dataBuffer[bufferIndex].power = power;
        dataBuffer[bufferIndex].energy = energy;
        dataBuffer[bufferIndex].IPAddress = IPAddress;
        dataBuffer[bufferIndex].timestamp = millis();
        bufferIndex = (bufferIndex + 1) % BUFFER_SIZE;
        bufferCount++;
        Serial.printf("Đã lưu dữ liệu vào buffer (%d/%d)\n", bufferCount, BUFFER_SIZE);
    }
    else
    {
        Serial.println("Buffer đầy! Bỏ qua dữ liệu mới.");
    }
}

void DataSender::sendBufferedData()
{
    if (bufferCount == 0)
        return;

    Serial.printf("Gửi lại %d dữ liệu từ buffer...\n", bufferCount);

    for (int i = 0; i < bufferCount; i++)
    {
        int index = (bufferIndex - bufferCount + i + BUFFER_SIZE) % BUFFER_SIZE;

        String topic = "meter/" + String(deviceId) + "/data";
        String payload = createPayload(
            serialNumber,
            dataBuffer[index].voltage,
            dataBuffer[index].current,
            dataBuffer[index].power,
            dataBuffer[index].energy,
            dataBuffer[index].IPAddress);

        if (client.publish(topic.c_str(), payload.c_str()))
        {
            Serial.printf("Gửi lại thành công: %s\n", payload.c_str());
        }
        else
        {
            Serial.println("Gửi lại thất bại");
            break;
        }
        delay(1000);
    }

    bufferCount = 0;
    bufferIndex = 0;
    Serial.println("Đã xóa buffer!");
}

String DataSender::createPayload(String serial_number, float voltage, float current, float power, float energy, String IPAddress)
{
    StaticJsonDocument<1024> doc; // 1024 bytes, thay đổi tuỳ dữ liệu
    doc["serial_number"] = serial_number;
    doc["device_id"] = deviceId;
    doc["voltage"] = voltage;
    doc["current"] = current;
    doc["power"] = power;
    doc["energy"] = energy;
    doc["ip_address"] = IPAddress;
    doc["timestamp"] = getTimestamp();
    doc["firmware_version"] = FIRMWARE_VERSION;
    doc["mac_address"] = WiFi.macAddress();
    doc["chip_family"] = "ESP32";
    doc["chip_model"] = ESP.getChipModel();
    doc["board_type"] = BOARD_TYPE;
    String output;
    serializeJson(doc, output);
    return output;
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
