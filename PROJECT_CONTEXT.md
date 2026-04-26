# Project Context

## Goal

ESP32 power meter project that reads electrical data from a `PZEM-004T v3.0` module and sends or exposes that data through the existing application stack.

## Repository

- Git remote: `git@github.com:mathangspk/ESP32_meter.git`
- Local path: `/Users/tma/opencode/esp32_loss_power`
- Default branch: `main`

## Tooling

- Build system: `PlatformIO`
- Framework: `Arduino`
- Board in `platformio.ini`: `esp32doit-devkit-v1`
- Main serial monitor speed: `115200`

Useful commands:

```bash
pio run
pio run -t upload --upload-port /dev/cu.SLAB_USBtoUART
pio device monitor -p /dev/cu.SLAB_USBtoUART -b 115200
```

## Hardware

- MCU: `ESP32`
- Meter module: `PZEM-004T v3.0`
- USB serial port seen on this machine: `/dev/cu.SLAB_USBtoUART`

Current UART wiring in code:

- `RX_PIN = 16`
- `TX_PIN = 17`
- `Meter meter(1, RX_PIN, TX_PIN);`

## Important Files

- `src/main.cpp`: main application flow
- `src/Meter.cpp`: PZEM read logic and time sync
- `include/Meter.h`: meter interface
- `src/DataSender.cpp`: payload creation and sending
- `src/NetworkManager.cpp`: Wi-Fi connection handling
- `platformio.ini`: board and dependency config

## Current Behavior

- Project already includes PZEM reading logic
- Meter reads:
  - voltage
  - current
  - power
  - energy
- Project also includes Wi-Fi, web config, MQTT-related sending, and OTA-related code

## Working Notes

- `pio run` succeeded on this machine
- Firmware has already been uploaded successfully to the ESP32 using `/dev/cu.SLAB_USBtoUART`
- Serial monitor via interactive `pio device monitor` may not work inside this non-interactive agent shell, but it should work in a normal terminal session
- Direct serial capture from this machine worked through a short Python `pyserial` read
- Live PZEM output has been confirmed from the device serial log:

```text
PZEM OK | V: 234.4 V | I: 0.000 A | P: 0.0 W | E: 3300.728 kWh
```

## Repository Workflow

- Repository-level workflow instructions live in `AGENTS.md`
- Current debugging state and next step live in `docs/handoff.md`
- Repeatable setup and debug steps live in `docs/setup.md` and `docs/debug-runbook.md`

## OpenCode Notes

- Global plugin installed: `opencode-caveman`
- For shorter responses in a new OpenCode session, use:

```text
/caveman lite
```
