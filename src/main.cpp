#include <Arduino.h>
#include "Meter.h"
#include "NetworkManager.h"
#include "DataSender.h"
#include "ConfigManager.h"
#include "WebConfig.h"
#include "WiFiLedStatus.h"
#include "DataReceiver.h"
// #include "OTAUpdate.h"
//  #include <WiFiManager.h>

// Define your RX and TX pins here (adjust as needed for your hardware)
#define RX_PIN 16
#define TX_PIN 17

Meter meter(1, RX_PIN, TX_PIN);
NetworkManager networkManager;
DataSender dataSender;
// DataReceiver *dataReceiver = nullptr;
ConfigManager configManager;
WebConfig webConfig(configManager);
WiFiLedStatus wifiLedStatus(LED_BUILTIN); // Use the built-in LED on ESP32

unsigned long lastWifiCheck = 0;
unsigned long lastSendData = 0;
unsigned long lastMeterLog = 0;
const unsigned long WIFI_CHECK_INTERVAL = 10000; // Kiểm tra WiFi mỗi 10 giây
const unsigned long SEND_INTERVAL = 10000;       // 10 giây
const unsigned long METER_LOG_INTERVAL = 2000;   // 2 giây

void setup()
{
    wifiLedStatus.begin();
    wifiLedStatus.setState(WiFiLedStatus::OFF);
    wifiLedStatus.update();
    Serial.begin(115200);
    // WiFiManager wifiManager;
    // wifiManager.resetSettings();

    // Load configuration
    configManager.loadConfig();

    // Update DataSender with loaded config
    dataSender.updateConfig(

        configManager.getMqttServer().c_str(),
        configManager.getMqttPort(),
        configManager.getDeviceId().c_str(),
        configManager.getSerialNumber().c_str(),
        configManager.getConfig().mqtt_password.c_str(),
        configManager.getConfig().mqtt_username.c_str());

    networkManager.connect();
    meter.syncTime();
    dataSender.setup();
    // Khởi tạo DataReceiver, truyền client từ dataSender

    // dataReceiver = new DataReceiver(dataSender.getClient());
    // dataReceiver->setup(configManager.getDeviceId().c_str());
    //  dataReceiver->setOtaHandler(handleOtaUpdate); // Đăng ký hàm OTA
    webConfig.begin();
    delay(1000);
    Serial.println("SSID đang kết nối: " + WiFi.SSID());
    Serial.println("IP Address: " + WiFi.localIP().toString());
    Serial.println("Web config available at: http://" + WiFi.localIP().toString());
    Serial.println("MAC Address: " + WiFi.macAddress());
    Serial.println("==================================================");
    Serial.println("CONNECTION INFO:");
    Serial.println("WiFi SSID: " + WiFi.SSID());
    Serial.println("IP Address: " + WiFi.localIP().toString());
    Serial.println("Gateway: " + WiFi.gatewayIP().toString());
    Serial.println("Subnet: " + WiFi.subnetMask().toString());
    Serial.println("DNS: " + WiFi.dnsIP().toString());
    Serial.println("==================================================");
}

WiFiLedStatus::LedState currentLedState = WiFiLedStatus::OFF;

void loop()
{
    dataSender.loop();
    webConfig.handle();
    // if (dataReceiver)
    //{
    //  Serial.println("🔄 Kiểm tra dữ liệu từ DataReceiver...");
    //    dataReceiver->loop();
    //}

    unsigned long now = millis();

    // Kiểm tra WiFi định kỳ
    if (now - lastWifiCheck > WIFI_CHECK_INTERVAL)
    {
        Serial.println("🔄 Kiểm tra kết nối WiFi...");
        if (!networkManager.isConnected())
        {
            if (networkManager.getWifiReconnectAttempts() < networkManager.getMaxWifiReconnectAttempts())
            {
                Serial.println("⚠️ Mất kết nối WiFi! Đang thử kết nối lại...");
                networkManager.reconnect();
                networkManager.incrementWifiReconnectAttempts();
            }
            else
            {
                Serial.println("⚠️ Mất kết nối WiFi! Đã đạt số lần thử lại tối đa.");
                // Potentially enter a deep sleep mode or take other action
            }
            // Nếu mất kết nối, chuyển LED sang trạng thái OFF
            if (currentLedState != WiFiLedStatus::OFF)
            {
                wifiLedStatus.setState(WiFiLedStatus::OFF);
                currentLedState = WiFiLedStatus::OFF;
            }
        }
        else
        {
            networkManager.resetWifiReconnectAttempts(); // Reset counter on successful connection
            if (currentLedState != WiFiLedStatus::ON)
            {
                wifiLedStatus.setState(WiFiLedStatus::ON);
                currentLedState = WiFiLedStatus::ON;
            }
            Serial.println("✅ Kết nối WiFi ổn định.");
        }
        lastWifiCheck = now;
    }

    MeterReadings readings = meter.getReadings();

    if (!isnan(readings.voltage))
    {
        if (now - lastMeterLog > METER_LOG_INTERVAL)
        {
            Serial.printf("PZEM OK | V: %.1f V | I: %.3f A | P: %.1f W | E: %.3f kWh\n",
                          readings.voltage,
                          readings.current,
                          readings.power,
                          readings.energy);
            lastMeterLog = now;
        }

        // Gửi dữ liệu định kỳ, không delay trong loop
        if (now - lastSendData > SEND_INTERVAL)
        {
            dataSender.sendData(readings.voltage, readings.current, readings.power, readings.energy, WiFi.localIP().toString());
            lastSendData = now;
        }
    }
    else if (now - lastMeterLog > METER_LOG_INTERVAL)
    {
        Serial.println("PZEM read failed: check module power, UART wiring, and GPIO16/GPIO17 RX/TX mapping.");
        lastMeterLog = now;
    }

    wifiLedStatus.update();

    // Không delay để LED update mượt
}
