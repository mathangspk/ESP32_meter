# Project Handoff - Firmware IP Update & Flashing

## Summary of Changes
- **ESP32 Firmware Flashing Success**: Successfully flashed the compiled firmware with the new default MQTT Server IP (`167.71.207.5`) to the ESP32 device connected via `COM3`.
- **PlatformIO Configuration Update**: Configured `upload_speed = 115200` in [platformio.ini](file:///c:/local/opencode/iot/esp32_loss_power/platformio.ini) for both `esp32doit-devkit-v1` and `nodemcuv2` targets to prevent connection handshake failures on Windows systems due to auto-reset timing limits.
- **Physical Bootloader Recovery Solution**: Formulated a 100% reliable hardware-level flashing procedure using a physical jumper wire from pin `D0` (GPIO0) to `GND` to recover ESP32 boards that fail to auto-reset or fall into rapid boot loops from corrupted flash data.

## Current System State
- The ESP32 device on `COM3` is successfully flashed with the updated firmware containing the fallback MQTT IP.
- The default upload speed is configured to a stable `115200` baud in `platformio.ini`.

## Verification & Testing
- **Manual Flashing**: Successfully connected to the chip using `esptool.py` and wrote the following segments:
  - Bootloader at `0x1000` (17,536 bytes) -> SUCCESS.
  - Partitions at `0x8000` (3,072 bytes) -> SUCCESS.
  - Boot App0 at `0xe000` (8,192 bytes) -> SUCCESS.
  - Firmware at `0x10000` (1,152,112 bytes) -> SUCCESS.
- **Auto-Reset Bypass**: Confirmed that pulling `D0` (GPIO0) LOW during startup puts the device cleanly into download mode and allows uninterrupted firmware uploads.

## Next Steps
- Reconnect the PZEM sensor wires (VCC, GND, RX, TX) to the ESP32.
- Unplug the jumper wire connecting pin `D0` to `GND` so the ESP32 can boot into normal operation mode.
- Power on the device and verify that it successfully connects to the home WiFi network and starts publishing power metrics to the dashboard.
