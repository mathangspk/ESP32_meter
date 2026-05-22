#ifndef METER_H
#define METER_H

#include <PZEM004Tv30.h>
#include <HardwareSerial.h>
#include <time.h>
#include "types/DataTypes.h"

class Meter
{
public:
    Meter(int uartPortNum, int rxPin, int txPin, uint8_t addr = PZEM_DEFAULT_ADDR);
    void syncTime();
    MeterReadings getReadings();

private:
    HardwareSerial pzemSerial;
    PZEM004Tv30 pzem;
};

#endif // METER_H
