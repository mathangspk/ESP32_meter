# Project Handoff - WiFi Reconfiguration Watchdog (v1.0.7)

## Summary of Changes
- **Persistent WiFi Failure Counter**: Implemented a boot WiFi failure count tracking mechanism stored in `/wifi_fail.txt` on LittleFS.
- **Dynamic Portal Timeout**:
  - For the first 3 consecutive failed boots, the config portal runs with a 300-second (5 minutes) timeout, allowing auto-recovery and rebooting if the router is just slow to boot (e.g. after a power outage).
  - On the 4th consecutive failed boot, the config portal runs indefinitely (`timeout = 0`) to allow the homeowner to easily connect and reconfigure the WiFi settings without the device rebooting.
  - Successfully clearing/removing the fail counter upon successful WiFi connection (either auto-connect, forced WiFi, or new config save).
- **Line-limit Compliance**: Ensured that the modified `NetworkManagerConnect.cpp` on both ESP32 and ESP8266 platforms remains under 100 lines (exactly 94 lines).
- **Version Bump**: Bumped default firmware version to `1.0.7` in `platformio.ini`.

## Current System State
- Test device `7B34E3EC` (`nhaba`, ESP32) is fully functional and running version `1.0.7`. It is currently online, reporting telemetry normally.
- Production device `D534E3EC` (`NhaLong`, ESP32) is currently online and running version `1.0.3`.
- Production device `004A936C` (`NLMT_Long`, ESP8266) is currently online and running version `1.0.3` (having been successfully power cycled by the user).
- All code compiles successfully with PlatformIO for both `esp32doit-devkit-v1` and `nodemcuv2` targets.
- All code files in the workspace strictly comply with the 100-line maximum limit.

## Verification & Testing
- **Firmware Compilation**: Succeeded for both `esp32doit-devkit-v1` and `nodemcuv2` targets.
- **OTA Deployment**: Successfully upgraded test device `7B34E3EC` (`nhaba`, ESP32) to version `1.0.7` via backend OTA. Device is online, reporting telemetry and running cleanly on version `1.0.7`.
- **ESP8266 Status**: Verified that the production device `004A936C` (`NLMT_Long`) is online.

## Next Steps
- Trigger the OTA update to version `1.0.7` for the production devices `004A936C` and `D534E3EC` via the backend API.
