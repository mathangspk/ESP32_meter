#include "DataSender.h"
#include <ArduinoJson.h>
#include <WiFi.h>
#include "ConfigManager.h"
#include "OTAUpdate.h"

#define FIRMWARE_VERSION "1.0.0"

extern ConfigManager configManager;

DataSender::DataSender()
    : mqttServer("113.161.220.166"), mqttPort(1883), deviceId("5"), serialNumber("SN005"),
      client(wifiClient), bufferIndex(0), bufferCount(0)
{
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

        // Thêm subscribe cho topic test
        String testTopic = "firmwareUpdateOTA/device/" + String(serialNumber);
        client.subscribe(testTopic.c_str());
        Serial.print("Subscribed to: ");
        Serial.println(testTopic);
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
    Serial.print("Message arrived [");
    Serial.print(topic);
    Serial.print("] ");

    String message;
    for (unsigned int i = 0; i < length; i++)
    {
        message += (char)payload[i];
    }
    Serial.println(message);

    // Parse JSON
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);
    if (error)
    {
        Serial.print("deserializeJson() failed: ");
        Serial.println(error.f_str());
        return;
    }

    const char *ota_url = doc["OTAurl"]; // 👉 Lấy ra trường OTAurl
    String expectedTopic = "firmwareUpdateOTA/device/" + String(serialNumber);

    if (String(topic) == expectedTopic)
    {
        Serial.println("Received OTA update command");

        if (ota_url && String(ota_url).startsWith("http"))
        {
            Serial.printf("Starting OTA update from URL: %s\n", ota_url);
            handleOtaUpdate(ota_url);
        }
        else
        {
            Serial.println("Invalid OTA URL received!");
        }
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