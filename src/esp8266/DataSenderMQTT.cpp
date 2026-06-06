#include "DataSender.h"

void DataSender::reconnect()
{
    unsigned long now = millis();
    if (now - lastReconnectAttempt < RECONNECT_INTERVAL) return;
    lastReconnectAttempt = now;

    Serial.printf("Attempting MQTT connection to %s:%d...\n", 
                  isUsingBackup ? mqttServerBackup.c_str() : mqttServer.c_str(), 
                  isUsingBackup ? mqttPortBackup : mqttPort);
    String clientId = "ESP8266Client-";
    clientId += String(random(0xffff), HEX);
    if (client.connect(clientId.c_str(), mqttUser.c_str(), mqttPassword.c_str()))
    {
        Serial.println("connected");
        consecutiveFailures = 0;
        client.subscribe(("meter/" + String(deviceId) + "/control").c_str());
        client.subscribe(("firmwareUpdateOTA/device/" + String(serialNumber)).c_str());
        flushPendingOtaStatus();
        sendBufferedData();
    }
    else
    {
        consecutiveFailures++;
        Serial.printf("failed, rc=%d, consecutive failures: %d\n", client.state(), consecutiveFailures);
        if (consecutiveFailures >= 3)
        {
            isUsingBackup = !isUsingBackup;
            consecutiveFailures = 0;
            String targetServer = isUsingBackup ? mqttServerBackup : mqttServer;
            int targetPort = isUsingBackup ? mqttPortBackup : mqttPort;
            client.setServer(targetServer.c_str(), targetPort);
            Serial.printf("⚠️ Switching MQTT target to %s: %s:%d\n", 
                          isUsingBackup ? "BACKUP" : "PRIMARY", targetServer.c_str(), targetPort);
            lastReconnectAttempt = 0;
        }
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
