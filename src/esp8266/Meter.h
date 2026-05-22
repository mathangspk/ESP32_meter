#ifndef METER_H
#define METER_H

#include <PZEM004Tv30.h>
#include <time.h>
#include "types/DataTypes.h"

#if defined(ESP8266)
#include <SoftwareSerial.h>
#elif defined(ESP32)
#include <HardwareSerial.h>
#endif

class Meter
{
public:
    Meter(int uartPortNum, int rxPin, int txPin, uint8_t addr = PZEM_DEFAULT_ADDR);
    void syncTime();
    MeterReadings getReadings();

private:
#if defined(ESP8266)
    SoftwareSerial pzemSerial;
#elif defined(ESP32)
    HardwareSerial pzemSerial;
#endif
    PZEM004Tv30 pzem;
};

#endif // METER_H

