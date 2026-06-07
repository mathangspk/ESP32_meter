# Project Handoff - WiFi Reconfiguration Watchdog (v1.0.6)

## Summary of Changes
- **Persistent WiFi Failure Counter**: Implemented a boot WiFi failure count tracking mechanism stored in `/wifi_fail.txt` on LittleFS.
- **Dynamic Portal Timeout**:
  - For the first 3 consecutive failed boots, the config portal runs with a 120-second timeout, allowing auto-recovery and rebooting if the router is just slow to boot.
  - On the 4th consecutive failed boot, the config portal runs indefinitely (`timeout = 0`) to allow the homeowner to easily connect and reconfigure the WiFi settings without the device rebooting.
  - Successfully clearing/removing the fail counter upon successful WiFi connection (either auto-connect, forced WiFi, or new config save).
- **Line-limit Compliance**: Ensured that the modified `NetworkManagerConnect.cpp` on both ESP32 and ESP8266 platforms remains under 100 lines (exactly 94 lines).
- **Version Bump**: Bumped default firmware version to `1.0.6` in `platformio.ini`.

## Current System State
- Test device `7B34E3EC` (`nhaba`, ESP32) is fully functional and running version `1.0.6`. It is currently online, reporting telemetry normally.
- Production device `D534E3EC` (`NhaLong`, ESP32) is currently online and running version `1.0.3`.
- Production device `004A936C` (`NLMT_Long`, ESP8266) is currently offline and running version `1.0.3` (which contains the dangling pointer bug, causing it to remain offline until a physical power cycle is performed).
- All code compiles successfully with PlatformIO for both `esp32doit-devkit-v1` and `nodemcuv2` targets.
- All code files in the workspace strictly comply with the 100-line maximum limit.

## Verification & Testing
- **Firmware Compilation**: Succeeded for both `esp32doit-devkit-v1` and `nodemcuv2` targets.
- **OTA Deployment**: Successfully upgraded test device `7B34E3EC` (`nhaba`, ESP32) to version `1.0.6` via backend OTA. Device is online, reporting telemetry and running cleanly on version `1.0.6`.

## Next Steps
- Prompt the user to power cycle the production device `004A936C` (`NLMT_Long`, ESP8266) to restore its connection.
- Once online, deploy version `1.0.6` to production devices `004A936C` and `D534E3EC` via backend OTA.
