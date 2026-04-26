# Session Handoff

## Current Goal

Bring up the containerized alert backend locally, then restore firmware MQTT connectivity to the new stack.

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
- Backend implementation plan is now fixed to `TypeScript + Express + MongoDB + Mosquitto + Telegram`

## Next Recommended Steps

1. Test again with a real electrical load and confirm `current` and `power` rise above zero.
2. Start the local backend stack with Docker and verify offline/recovered Telegram alerts.
3. Point firmware MQTT config to the local Mosquitto broker and verify end-to-end ingest.
4. After local backend success, prepare VPS deploy with GHCR image pull.
5. Debug NTP sync failure.

## Known Constraints

- This environment can build and upload firmware
- Interactive serial monitoring from the agent shell is limited
- The best place to verify live logs is a normal local terminal using `pio device monitor`
- Backend TypeScript build and typecheck pass locally, but container verification is blocked on this machine until Docker is installed

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
- Backend TypeScript scaffold, Docker compose files, and GHCR workflows were added to the repo
- Backend verification: `npm install`, `npm run build`, and `npm run typecheck` passed under `backend/`

## Suggested New Session Prompt

```text
/caveman lite

Read `PROJECT_CONTEXT.md` and `docs/handoff.md` first.
Then continue the ESP32 PZEM debugging workflow.
Start with the current goal in `docs/handoff.md`.
```
