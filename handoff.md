# Project Handoff - Firmware IP & Version Update

## Summary of Changes
- **Firmware Version v1.0.2 Configuration**: Added `-D FIRMWARE_VERSION=\"1.0.2\"` build flags in [platformio.ini](file:///c:/local/opencode/iot/esp32_loss_power/platformio.ini) for both `esp32doit-devkit-v1` and `nodemcuv2` targets, ensuring devices report their version correctly as `1.0.2` on the dashboard.
- **Upload Speed Adjustment**: Set `upload_speed = 115200` in `platformio.ini` for stable connection handshake on Windows machines.
- **Flashing Handover**: Compiled the firmware successfully and handed over the manual flashing commands to the user to execute directly via their terminal for perfect physical button synchronization.

## Current System State
- Firmware version `1.0.2` has been successfully compiled locally.
- `platformio.ini` configuration is committed with stable upload settings and version flags.

## Next Steps
- User to run the flashing command from their terminal and hold the BOOT button to upload the firmware.
- Remove the physical jumper wire from `D0` to `GND`.
- Reconnect the PZEM sensor wires to the ESP32 and monitor the web dashboard at `http://167.71.207.5:8080` to verify the online status showing version `1.0.2`.
