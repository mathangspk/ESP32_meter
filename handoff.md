# Project Handoff - Active-Passive MQTT Failover Redundancy

## Summary of Changes
- **Active-Passive MQTT Failover**: Implemented a connection failover strategy where the device targets the Primary MQTT broker. If it fails 3 consecutive times, it cycles targeting to the Backup MQTT broker.
- **Preemptive Primary Reconnection**: When connected to the backup broker, the device checks every 5 minutes (300,000 ms) by disconnecting and attempting to reconnect to the primary broker. If it fails, it cycles back to the backup broker seamlessly.
- **Configurable Backup Settings**: Added "Backup MQTT Server" and "Backup MQTT Port" input fields to the local Web Captive Portal configuration page (`WebConfigHTML.h` & `WebConfig.cpp`), which persists configuration variables to LittleFS.
- **100-Line Limit Compliance**: Split `ConfigManagerIO.cpp` into `ConfigManagerLoad.cpp` and `ConfigManagerSave.cpp` across both ESP32 and ESP8266 platforms. Compiling and refactoring kept all modified files strictly under 100 lines.

## Current System State
- Every single code and stylesheet file in the repository satisfies the 100-line limit.
- All code compiles successfully with PlatformIO for both `esp32doit-devkit-v1` and `nodemcuv2` targets.

## Verification & Testing
- Ran PlatformIO compilation: `pio run` -> Both targets succeeded with zero compiler/linker warnings or errors.

## Next Steps
- Advise the user to perform OTA updates or local USB flash using the compiled binaries.
- Test active-passive failover by simulating primary MQTT broker downtime (e.g. stopping container/blocking ports) and confirming switch to backup.
