# Project Handoff - WiFi Reconfiguration Watchdog (v1.0.8)

## Summary of Changes
- **Persistent WiFi Failure Counter**: Implemented a boot WiFi failure count tracking mechanism stored in `/wifi_fail.txt` on LittleFS.
- **Dynamic Portal Timeout**:
  - For the first 3 consecutive failed boots, the config portal runs with a 60-second (1 minute) timeout, allowing auto-recovery and rebooting if the router is just slow to boot (e.g. after a power outage).
  - On the 4th consecutive failed boot, the config portal runs with a 600-second (10 minutes) timeout, allowing the homeowner to connect and reconfigure the WiFi settings while automatically rebooting to try again if no configuration is saved.
  - Successfully clearing/removing the fail counter upon successful WiFi connection (either auto-connect, forced WiFi, or new config save).
- **Line-limit Compliance**: Ensured that the modified `NetworkManagerConnect.cpp` on both ESP32 and ESP8266 platforms remains under 100 lines (exactly 94 lines).
- **Version Bump**: Bumped default firmware version to `1.0.8` in `platformio.ini`.

## Current System State
- Test device `7B34E3EC` (`nhaba`, ESP32) is fully functional and running version `1.0.8`. It is online, reporting telemetry normally.
- Production device `D534E3EC` (`NhaLong`, ESP32) is fully functional, successfully upgraded, online, and running version `1.0.8`.
- Production device `004A936C` (`NLMT_Long`, ESP8266) is fully functional, successfully upgraded, online, and running version `1.0.8`.
- All code compiles successfully with PlatformIO for both `esp32doit-devkit-v1` and `nodemcuv2` targets.
- All code files in the workspace strictly comply with the 100-line maximum limit.

## Verification & Testing
- **Firmware Compilation**: Succeeded for both `esp32doit-devkit-v1` and `nodemcuv2` targets.
- **OTA Deployment & Verification**:
  - Test device `nhaba` successfully upgraded to `1.0.8` via OTA and verified online.
  - Production device `NhaLong` successfully upgraded to `1.0.8` via OTA, verified online, and sending telemetry.
  - Production device `NLMT_Long` successfully upgraded to `1.0.8` via OTA, verified online, and sending telemetry.
- **Fleet Status**: 100% of devices in the fleet are confirmed online, healthy, and running version `1.0.8`.

## Next Steps
- Monitor fleet stability and continue regular telemetry operations.
