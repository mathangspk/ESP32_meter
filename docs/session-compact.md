# Session Compact

## Current State

- Local MQTT recovery is complete.
- GitHub-hosted OTA success path is complete.
- `SN005` is online and now reports firmware `1.0.1-ota-verification-3`.
- The current focus is a longer stability check on the recovered runtime path.

## What Changed

### Firmware

- Added optional forced Wi-Fi credentials before WiFiManager fallback for local recovery work.
- Increased MQTT keepalive to reduce disconnects during long-running OTA work.
- Improved NTP sync retries and added `time.google.com`.
- Removed the separate OTA preflight HTTP GET that was crashing on long GitHub asset URLs.
- Moved OTA execution into a dedicated FreeRTOS task with a larger stack.

### Backend

- OTA release URLs from GitHub Releases are now resolved to fresh signed asset URLs per job.
- Existing OTA, fleet, claim, action, bot, and firmware policy APIs remain in place.

### Local Runtime

- Docker `mosquitto` remains the only broker.
- Host port `1883` is relayed to Docker `1884` for ESP32 LAN access.
- Homebrew `mosquitto` remains disabled.

## Verified Outcomes

- MQTT reconnect on the live ESP32 is working again.
- Backend health is OK with MQTT and MongoDB connected.
- NTP boot path reached `Time synced!` in the verified serial trace.
- OTA job `4863f80d-bc41-41ab-a202-1f63d8c1e71e` reached `success`.
- `GET /devices/SN005/health` now shows:
  - `isOffline=false`
  - `lastFirmwareVersion=1.0.1-ota-verification-3`
  - `lastOtaStatus=success`

## Important Notes

- Reading serial from the agent still reboots the ESP32.
- OTA is now verified, so future stability runs should avoid serial reads unless actively debugging.
- The firmware still stores OTA `sha256` metadata, but checksum enforcement is not implemented yet.

## BMAD Summary

- Workflow-only BMAD is now active in this repo.
- Routing policy lives in `AGENTS.md`.
- BMAD guidance lives in `docs/bmad-opencode.md`.
- Session metrics live in `docs/bmad-scorecard.md`.

## Source Of Truth

Read these first in a new session:

1. `PROJECT_CONTEXT.md`
2. `docs/handoff.md`
3. `docs/session-compact.md`
4. `docs/bmad-scorecard.md`

## Best Next Step

1. Run a longer stability check on `SN005` with firmware `1.0.1-ota-verification-3`.
2. Confirm telemetry, MQTT connectivity, and OTA status remain stable without serial interaction.
3. If stable, treat `5ee1beb fix: complete local MQTT and OTA recovery` as the restored runtime baseline.
