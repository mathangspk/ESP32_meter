# Session Handoff

## Current Goal

Validate readings under a real load, then restore MQTT connectivity.

## Confirmed State

- Repo connected to `git@github.com:mathangspk/ESP32_meter.git`
- Local branch `main` tracks `origin/main`
- Build currently passes with `pio run`
- ESP32 is detected on this machine at `/dev/cu.SLAB_USBtoUART`
- Current code already contains a `Meter` class that reads PZEM data
- UART pins in code are `GPIO16` and `GPIO17`
- `opencode-caveman` is installed globally for OpenCode
- Firmware with serial PZEM diagnostics has been uploaded successfully
- Serial logs confirmed live PZEM data:

```text
PZEM OK | V: 234.4 V | I: 0.000 A | P: 0.0 W | E: 3300.728 kWh
```
- Wi-Fi connection succeeds on the device
- Current MQTT connect attempt fails with `rc=-2`
- Current NTP sync attempt fails with `Failed to sync time`

## Next Recommended Steps

1. Test again with a real electrical load and confirm `current` and `power` rise above zero.
2. Debug MQTT `rc=-2` and verify successful broker connection.
3. Debug NTP sync failure.
4. Reduce debug log noise after MQTT and NTP are stable.

## Known Constraints

- This environment can build and upload firmware
- Interactive serial monitoring from the agent shell is limited
- The best place to verify live logs is a normal local terminal using `pio device monitor`

## Most Relevant Commands

```bash
pio run
pio run -t upload --upload-port /dev/cu.SLAB_USBtoUART
pio device monitor -p /dev/cu.SLAB_USBtoUART -b 115200
```

## Last Verified Result

- Build: passed
- Upload: passed
- Serial verification: passed
- Evidence: device emitted a valid `PZEM OK` line with voltage and energy data

## Suggested New Session Prompt

```text
/caveman lite

Read `PROJECT_CONTEXT.md` and `docs/handoff.md` first.
Then continue the ESP32 PZEM debugging workflow.
Start with the current goal in `docs/handoff.md`.
```
