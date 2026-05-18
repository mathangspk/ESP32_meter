# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read First

Before starting any session, read:
1. `PROJECT_CONTEXT.md` — hardware specs, build commands, confirmed runtime state
2. `docs/handoff.md` — current goal, last verified milestone, next recommended step

## Repository Structure

This monorepo has three distinct components:

- **`src/` + `include/`** — ESP32 Arduino firmware (PlatformIO)
- **`backend/`** — Node.js/TypeScript HTTP + MQTT ingestion server
- **`assistant-bot/`** — Node.js/TypeScript Telegram bot with NLU

## Firmware (ESP32 / PlatformIO)

Board: `esp32doit-devkit-v1`, Framework: Arduino, UART: RX=GPIO16, TX=GPIO17 for PZEM-004T v3.0.

```bash
pio run                                                         # build
pio run -t upload --upload-port /dev/cu.SLAB_USBtoUART         # upload (macOS only)
pio device monitor -p /dev/cu.SLAB_USBtoUART -b 115200         # serial monitor
```

Upload and serial access require a macOS machine with `/dev/cu.SLAB_USBtoUART`. Neither is available on Windows.

### Firmware Architecture

`main.cpp` runs a non-blocking loop with three time-based intervals:
- Every 2s: read PZEM via `Meter` (UART1), log to serial
- Every 10s: publish telemetry via `DataSender` (MQTT over WiFi)
- Every 10s: check WiFi via `NetworkManager`, toggle LED via `WiFiLedStatus`

`ConfigManager` loads MQTT credentials and device identity from NVS/SPIFFS. `WebConfig` exposes a local HTTP config portal. `OTAUpdate` (currently commented out) handles firmware self-update.

## Backend (Node.js/TypeScript)

```bash
cd backend
npm install
npm run build
npm start
```

Runs on port 3000. Entry point: `backend/src/index.ts`.

### Backend Architecture

Three long-lived services started at boot:
- `mqttService` — subscribes to `meter/+/telemetry` and `meter/+/ota/status`; parses with Zod, writes to MongoDB
- `mongoService` — wraps all MongoDB access; stores telemetry, device state, OTA jobs, analytics snapshots, notifications, users, tenants, sites
- HTTP server (`createHttpApp`) — Express REST API

The HTTP API exposes: `/healthz`, `/devices/*`, `/ota/jobs/*`, `/firmware/releases/*`, `/analytics/*`, `/alerts`, `/users/*`, `/tenants/*`, `/sites/*`, `/bot-sessions/*`, `/notifications/*`.

On each MQTT telemetry message, `handleTelemetryAlertTransitions` compares the new reading to stored thresholds and queues Telegram notifications for offline/online transitions.

Energy analytics use boundary-based counter snapshots: `last_7_days` and `last_week` return `insufficient_data` if boundary snapshots are missing by >5 minutes.

## Assistant Bot (Node.js/TypeScript)

```bash
cd assistant-bot
npm install
npm run build
npm start
```

Entry point: `assistant-bot/src/index.ts`.

### Bot Architecture

Two concurrent infinite loops (`Promise.all`):
1. **Telegram poll loop** — long-polls `getUpdates`, dispatches each message through `processMessage`
2. **Notification queue loop** — polls `backendClient.getPendingNotifications`, delivers queued alerts via `sendMessage`

Message routing in `processMessage`:
1. Pending state handlers (claim flow, device action confirmation, OTA confirmation, tenant selection)
2. Identity resolution via `backendClient.identifyTelegramUser`
3. `/command` dispatch or natural language pipeline

Natural language pipeline (first match wins):
1. `handleNaturalLanguageDeviceAction` — regex over normalized text for reboot/remove/factory_reset
2. `handleFirmwareVersionQuestion` — firmware version/upgrade queries
3. `handleDeviceDetailQuestion` — device detail lookups
4. `handleAnalyticsIntent` — energy/power analytics via `parseAnalyticsIntent` (Groq-backed with keyword fallback in `fallbackParseAnalyticsIntent`)
5. `handleInventoryQuestion` — device count/list via `parseInventoryIntent` (Groq-backed)
6. Fallback: `askGroq` with fleet/tenant context

Vietnamese text normalization (`normalizeVietnameseText`) strips diacritics and lowercases before all regex matching. Device names like "nhaba" are matched against `displayName` with partial-match fallback.

## Deployment

All build and deploy runs on VPS via SSH. Local Windows environment has no `npm`, `docker`, or `node`.

```bash
ssh vps-prod                           # Tailscale required; key at ~/.ssh/opencode_vps

# Check status
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && DOCKER_CONFIG=/home/tma_agi/empty-docker-config docker-compose -f docker-compose.deploy.yml ps"

# Rebuild and restart a service (e.g., assistant-bot)
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && DOCKER_CONFIG=/home/tma_agi/empty-docker-config docker-compose -f docker-compose.deploy.yml up -d --build assistant-bot"

# Check backend health
ssh vps-prod "curl -sS http://127.0.0.1:3000/healthz"
```

VPS stack (`docker-compose.vps.yml`): mosquitto (1883), mongodb, backend (127.0.0.1:3000), assistant-bot. Production env from `.env.prod`.

Deploy directory on VPS: `/home/tma_agi/esp32_loss_power_deploy` using `docker-compose.deploy.yml`.

## Handoff Rule

After each verified milestone, update `docs/handoff.md` with what was confirmed, what changed, remaining issues, and exact next step.
