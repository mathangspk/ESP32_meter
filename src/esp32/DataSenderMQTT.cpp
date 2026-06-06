#include "DataSender.h"

void DataSender::reconnect()
{
    unsigned long now = millis();
    if (now - lastReconnectAttempt < RECONNECT_INTERVAL) return;
    lastReconnectAttempt = now;

    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP8266Client-";
    clientId += String(random(0xffff), HEX);
    if (client.connect(clientId.c_str(), mqttUser.c_str(), mqttPassword.c_str()))
    {
        Serial.println("connected");
        client.subscribe(("meter/" + String(deviceId) + "/control").c_str());
        client.subscribe(("firmwareUpdateOTA/device/" + String(serialNumber)).c_str());
        flushPendingOtaStatus();
        sendBufferedData();
    }
    else
    {
        Serial.printf("failed, rc=%d retrying in 5 seconds\n", client.state());
    }
}

void DataSender::callback(char *topic, byte *payload, unsigned int length)
{
    String controlTopic = "meter/" + String(deviceId) + "/control";
    String otaTopic = "firmwareUpdateOTA/device/" + String(serialNumber);
    String currentTopic = String(topic);

    if (currentTopic == controlTopic)
    {
        handleControlCommand(payload, length);
    }
    else if (currentTopic == otaTopic)
    {
        handleOtaCommand(payload, length);
    }
}
