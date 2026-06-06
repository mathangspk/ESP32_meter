#include <Arduino.h>
#include "Meter.h"
#include "NetworkManager.h"
#include "DataSender.h"
#include "ConfigManager.h"
#include "WebConfig.h"
#include "WiFiLedStatus.h"
#include "DataReceiver.h"

#define RX_PIN 16
#define TX_PIN 17

Meter meter(1, RX_PIN, TX_PIN);
NetworkManager networkManager;
DataSender dataSender;
ConfigManager configManager;
WebConfig webConfig(configManager);
WiFiLedStatus wifiLedStatus(LED_BUILTIN);

unsigned long lastWifiCheck = 0;
unsigned long lastSendData = 0;
unsigned long lastMeterLog = 0;
extern const unsigned long WIFI_CHECK_INTERVAL = 10000;
extern const unsigned long SEND_INTERVAL = 10000;
extern const unsigned long METER_LOG_INTERVAL = 2000;
WiFiLedStatus::LedState currentLedState = WiFiLedStatus::OFF;

void checkWiFi();
void logAndSendMeterData();

void setup()
{
    wifiLedStatus.begin();
    wifiLedStatus.setState(WiFiLedStatus::OFF);
    wifiLedStatus.update();
    Serial.begin(115200);

    configManager.loadConfig();

    dataSender.updateConfig(
        configManager.getMqttServer().c_str(),
        configManager.getMqttPort(),
        configManager.getMqttServerBackup().c_str(),
        configManager.getMqttPortBackup(),
        configManager.getDeviceId().c_str(),
        configManager.getSerialNumber().c_str(),
        configManager.getConfig().mqtt_password.c_str(),
        configManager.getConfig().mqtt_username.c_str());

    networkManager.connect(&configManager);
    meter.syncTime();
    dataSender.setup();
    webConfig.begin();
    delay(1000);

    Serial.println("==================================================");
    Serial.println("CONNECTION INFO:");
    Serial.println("WiFi SSID: " + WiFi.SSID());
    Serial.println("IP Address: " + WiFi.localIP().toString());
    Serial.println("Gateway: " + WiFi.gatewayIP().toString());
    Serial.println("Subnet: " + WiFi.subnetMask().toString());
    Serial.println("DNS: " + WiFi.dnsIP().toString());
    Serial.println("==================================================");
}

void loop()
{
    dataSender.loop();
    webConfig.handle();
    checkWiFi();
    logAndSendMeterData();
    wifiLedStatus.update();
}
