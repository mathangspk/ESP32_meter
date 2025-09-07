#include <Arduino.h>
#include <HardwareSerial.h>
#include <PZEM004Tv30.h>
#include "Meter.h"
#include "types/DataTypes.h"

Meter::Meter(int uartPortNum, int rxPin, int txPin, uint8_t addr)
    : pzemSerial(uartPortNum), pzem(pzemSerial, rxPin, txPin, addr)
{
    pzemSerial.begin(9600, SERIAL_8N1, rxPin, txPin);
}

MeterReadings Meter::getReadings()
{
    MeterReadings readings;
    readings.voltage = pzem.voltage();
    readings.current = pzem.current();
    readings.power = pzem.power();
    readings.energy = pzem.energy();

    if (isnan(readings.voltage) || isnan(readings.current) || isnan(readings.power) || isnan(readings.energy))
    {
        readings.voltage = readings.current = readings.power = readings.energy = NAN;
    }
    return readings;
}

void Meter::syncTime()
{
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    Serial.print("Syncing time");
    time_t now = time(nullptr);
    int retry = 0;
    const int retry_count = 10;
    while (now < 8 * 3600 * 2 && retry < retry_count)
    {
        delay(500);
        Serial.print(".");
        now = time(nullptr);
        retry++;
    }
    Serial.println();
    if (now < 8 * 3600 * 2)
        Serial.println("Failed to sync time");
    else
        Serial.println("Time synced!");
}
