#include "WiFiLedStatus.h"

WiFiLedStatus::WiFiLedStatus(uint8_t pin) : _pin(pin), _state(OFF), _previousMillis(0), _ledOn(false) {}

void WiFiLedStatus::begin()
{
    pinMode(_pin, OUTPUT);
    ledOff();
}

void WiFiLedStatus::setState(LedState state)
{
    if (_state != state)
    {
        _state = state;
        // reset led status on state change
        _previousMillis = millis();
        _ledOn = false;
        if (_state == ON)
        {
            ledOn();
        }
        else if (_state == OFF)
        {
            ledOff();
        }
    }
}

void WiFiLedStatus::update()
{
    if (_state == BLINK_FAST || _state == BLINK_SLOW)
    {
        unsigned long interval = (_state == BLINK_FAST) ? fastInterval : slowInterval;
        unsigned long currentMillis = millis();
        if (currentMillis - _previousMillis >= interval)
        {
            _previousMillis = currentMillis;
            if (_ledOn)
            {
                ledOff();
                _ledOn = false;
            }
            else
            {
                ledOn();
                _ledOn = true;
            }
        }
    }
    // ON or OFF trạng thái thì không cần cập nhật
}

void WiFiLedStatus::ledOn()
{
    // LED tích hợp ESP8266 thường active LOW
    digitalWrite(_pin, LOW);
}

void WiFiLedStatus::ledOff()
{
    digitalWrite(_pin, HIGH);
}
