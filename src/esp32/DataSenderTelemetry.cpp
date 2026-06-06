#include "DataSender.h"
#include <ArduinoJson.h>
#include <WiFi.h>

#ifndef FIRMWARE_VERSION
#define FIRMWARE_VERSION "1.0.0"
#endif
#ifndef BOARD_TYPE
#define BOARD_TYPE "esp32doit-devkit-v1"
#endif

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
        Serial.println("No MQTT connection! Saving to buffer...");
        addToBuffer(voltage, current, power, energy, IPAddress);
    }
}

void DataSender::addToBuffer(float voltage, float current, float power, float energy, String IPAddress)
{
    if (bufferCount < BUFFER_SIZE)
    {
        dataBuffer[bufferIndex] = { voltage, current, power, energy, IPAddress, millis() };
        bufferIndex = (bufferIndex + 1) % BUFFER_SIZE;
        bufferCount++;
        Serial.printf("Saved to buffer (%d/%d)\n", bufferCount, BUFFER_SIZE);
    }
    else
    {
        Serial.println("Buffer full! Ignoring new data.");
    }
}

void DataSender::sendBufferedData()
{
    if (bufferCount == 0) return;
    Serial.printf("Resending %d data from buffer...\n", bufferCount);

    for (int i = 0; i < bufferCount; i++)
    {
        int index = (bufferIndex - bufferCount + i + BUFFER_SIZE) % BUFFER_SIZE;
        String topic = "meter/" + String(deviceId) + "/data";
        String payload = createPayload(serialNumber, dataBuffer[index].voltage, dataBuffer[index].current, dataBuffer[index].power, dataBuffer[index].energy, dataBuffer[index].IPAddress);

        if (client.publish(topic.c_str(), payload.c_str()))
        {
            Serial.printf("Resent successfully: %s\n", payload.c_str());
        }
        else
        {
            Serial.println("Resend failed");
            break;
        }
        delay(1000);
    }
    bufferCount = 0;
    bufferIndex = 0;
    Serial.println("Cleared buffer!");
}

String DataSender::createPayload(String serial_number, float voltage, float current, float power, float energy, String IPAddress)
{
    StaticJsonDocument<1024> doc;
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
