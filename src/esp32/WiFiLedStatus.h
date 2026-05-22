#ifndef WIFI_LED_STATUS_H
#define WIFI_LED_STATUS_H

#include <Arduino.h>
#include <WiFi.h>

class WiFiLedStatus
{
public:
    enum LedState
    {
        OFF,
        ON,
        BLINK_FAST,
        BLINK_SLOW
    };

    WiFiLedStatus(uint8_t pin);

    void begin();
    void setState(LedState state);
    void update();

private:
    uint8_t _pin;
    LedState _state;
    unsigned long _previousMillis;
    bool _ledOn;

    static const unsigned long fastInterval = 200;  // 200 ms
    static const unsigned long slowInterval = 1000; // 1 s

    void ledOn();
    void ledOff();
};

#endif
