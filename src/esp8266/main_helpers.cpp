#include <Arduino.h>
#include "Meter.h"
#include "NetworkManager.h"
#include "DataSender.h"
#include "ConfigManager.h"
#include "WiFiLedStatus.h"

extern Meter meter;
extern NetworkManager networkManager;
extern DataSender dataSender;
extern WiFiLedStatus wifiLedStatus;
extern ConfigManager configManager;

extern unsigned long lastWifiCheck;
extern unsigned long lastSendData;
extern unsigned long lastMeterLog;
extern const unsigned long WIFI_CHECK_INTERVAL;
extern const unsigned long SEND_INTERVAL;
extern const unsigned long METER_LOG_INTERVAL;
extern WiFiLedStatus::LedState currentLedState;

void checkWiFi()
{
    unsigned long now = millis();
    if (now - lastWifiCheck > WIFI_CHECK_INTERVAL)
    {
        Serial.println("🔄 Kiểm tra kết nối WiFi...");
        if (!networkManager.isConnected())
        {
            if (networkManager.getWifiReconnectAttempts() < networkManager.getMaxWifiReconnectAttempts())
            {
                Serial.println("⚠️ Mất kết nối WiFi! Đang thử kết nối lại...");
                networkManager.reconnect(&configManager);
                networkManager.incrementWifiReconnectAttempts();
            }
            else
            {
                Serial.println("⚠️ Mất kết nối WiFi! Đã đạt số lần thử lại tối đa.");
            }
            if (currentLedState != WiFiLedStatus::OFF)
            {
                wifiLedStatus.setState(WiFiLedStatus::OFF);
                currentLedState = WiFiLedStatus::OFF;
            }
        }
        else
        {
            networkManager.resetWifiReconnectAttempts();
            if (currentLedState != WiFiLedStatus::ON)
            {
                wifiLedStatus.setState(WiFiLedStatus::ON);
                currentLedState = WiFiLedStatus::ON;
            }
            Serial.println("✅ Kết nối WiFi ổn định.");
        }
        lastWifiCheck = now;
    }
}

void logAndSendMeterData()
{
    unsigned long now = millis();
    MeterReadings readings = meter.getReadings();
    static unsigned long firstNanAt = 0;

    if (!isnan(readings.voltage))
    {
        firstNanAt = 0;
        if (now - lastMeterLog > METER_LOG_INTERVAL)
        {
            Serial.printf("PZEM OK | V: %.1f V | I: %.3f A | P: %.1f W | E: %.3f kWh\n", readings.voltage, readings.current, readings.power, readings.energy);
            lastMeterLog = now;
        }

        if (now - lastSendData > SEND_INTERVAL)
        {
            dataSender.sendData(readings.voltage, readings.current, readings.power, readings.energy, WiFi.localIP().toString());
            lastSendData = now;
        }
    }
    else
    {
        if (firstNanAt == 0) firstNanAt = now;
        if (now - firstNanAt > 60000)
        {
            Serial.println("PZEM unresponsive for 60s — restarting.");
            delay(500); ESP.restart();
        }

        if (now - lastMeterLog > METER_LOG_INTERVAL)
        {
            Serial.println("PZEM read failed: check module power, UART wiring, and GPIO16/GPIO17 RX/TX mapping.");
            lastMeterLog = now;
        }
    }
}
