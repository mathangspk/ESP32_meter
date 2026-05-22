# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Team Agent Configuration
@/mnt/c/local/claude_manager/team-agent/workflow.md

## Read First

Before starting any session, read:
1. `PROJECT_CONTEXT.md` — hardware specs, build commands, confirmed runtime state
2. `docs/handoff.md` — current goal, last verified milestone, next recommended step

## Repository Structure

This monorepo has four distinct components:

- **`src/` + `include/`** — ESP32 Arduino firmware (PlatformIO)
- **`backend/`** — Node.js/TypeScript HTTP + MQTT ingestion server
- **`assistant-bot/`** — Node.js/TypeScript Telegram bot with NLU
- **`frontend/`** — React/TypeScript dashboard SPA (Vite, served by Nginx on port 8080)

## Firmware (ESP32 / PlatformIO)

Board: `esp32doit-devkit-v1`, Framework: Arduino, UART: RX=GPIO16, TX=GPIO17 for PZEM-004T v3.0.

```bash
pio run                                                         # build
pio run -t upload --upload-port /dev/cu.SLAB_USBtoUART         # upload (macOS only)
pio device monitor -p /dev/cu.SLAB_USBtoUART -b 115200         # serial monitor
```

Upload and serial access require a macOS machine with `/dev/cu.SLAB_USBtoUART`. Neither is available on Windows.

Firmware releases are triggered by pushing a `fw-v*` tag. GitHub Actions builds the release artifact automatically (`firmware-release.yml`).

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
npm run dev          # run with tsx (hot reload, no build step)
npm run typecheck    # type-check without emitting
npm run build        # compile to dist/
npm start            # run compiled dist/index.js
```

Runs on port 3000. Entry point: `backend/src/index.ts`.

### Backend Architecture

Three long-lived services started at boot:
- `mqttService` — subscribes to `meter/+/telemetry` and `meter/+/ota/status`; parses with Zod, writes to MongoDB
- `mongoService` — thin orchestrator in `mongodb.ts` (~170 lines of delegates) backed by domain repositories in `backend/src/db/`
- HTTP server (`createHttpApp` in `http.ts`) — thin orchestrator that mounts route modules from `backend/src/routes/`

**Database layer (`backend/src/db/`):**
- `device.repo.ts` — `DeviceRepo`: device CRUD, claim/unclaim, commands
- `telemetry.repo.ts` — `TelemetryRepo`: ingest, device state, rollup, offline tracking
- `ota.repo.ts` — `OtaRepo`: OTA jobs, firmware releases, policy evaluation
- `user.repo.ts` — `UserRepo`: web users, Telegram identity, memberships
- `tenant.repo.ts` — `TenantRepo`: tenants, sites
- `alert.repo.ts` — `AlertRepo`: alert events, notification queue
- `bot.repo.ts` — `BotRepo`: bot sessions
- `analytics.repo.ts` — `AnalyticsRepo`: daily summary, energy analytics
- `analytics.ts` — pure timezone/energy math (no DB access)
- `types.ts` — all exported record types

**Route modules (`backend/src/routes/`):**
- `auth.ts` — `/auth/login`, `/auth/me`
- `dashboard.ts` — `/dashboard/*` (JWT-protected)
- `devices.ts` — `/devices/*`
- `ota.ts` — `/ota/jobs/*`
- `admin.ts` — `/admin/*`
- `internal.ts` — `/internal/*` (bot-to-backend calls)
- `utils.ts` — shared `parseLimit()` helper

**Offline alerting (`alerts.ts`):** Two-phase logic — device silent >45s stamps `offlineSince`; a timer fires alerts only after `offlineSince` > 2 minutes, preventing notification spam during restarts.

Energy analytics use boundary-based counter snapshots: `last_7_days` and `last_week` return `insufficient_data` if boundary snapshots are missing by >5 minutes.

On startup, `index.ts` runs `runRollupCatchup` (backfills any missing hourly buckets up to 95 days back) and schedules `runDailyRollup` at 2am UTC.

## Assistant Bot (Node.js/TypeScript)

```bash
cd assistant-bot
npm install
npm run dev          # run with tsx
npm run typecheck
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

## Frontend (React / Vite)

```bash
cd frontend
npm install
npm run dev      # Vite dev server
npm run build    # type-check + Vite production build
```

React 18 SPA with React Router v6. JWT stored in memory; login via `POST /auth/login`. Served in production by Nginx on port 8080 via the `frontend` Docker container.

## CI/CD (GitHub Actions)

Six workflows under `.github/workflows/`:
- `backend-ci.yml` — typecheck + build on every `backend/**` push/PR
- `backend-image.yml` — builds and pushes `ghcr.io/mathangspk/esp32-loss-power-backend:latest` on merge to main
- `assistant-bot-ci.yml` / `assistant-bot-image.yml` — same pattern for bot
- `frontend-image.yml` — builds and pushes frontend image
- `firmware-release.yml` — triggered by `fw-v*` tag push; creates GitHub Release with firmware binary

## Deployment

All build and deploy runs on VPS via SSH. Local Windows environment has no `npm`, `docker`, or `node`.

```bash
ssh vps-prod                           # Tailscale required; key at ~/.ssh/opencode_vps

# Check all 5 containers (mosquitto, mongodb, backend, assistant-bot, frontend)
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml ps"

# Deploy a service after git push (CI builds image first)
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && \
  DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml pull backend && \
  DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml up -d backend"

# Check backend health
ssh vps-prod "curl -sS http://127.0.0.1:3000/healthz"

# Tail logs
ssh vps-prod "docker logs esp32losspowerdeploy_backend_1 --tail 30"
```

VPS deploy directory: `/home/tma_agi/esp32_loss_power_deploy` using `docker-compose.deploy.yml`. GHCR auth config: `/home/tma_agi/ghcr-docker-config/config.json`. Production env from `.env.prod`.

If GHCR pulls fail, the PAT has likely expired — regenerate and update `/home/tma_agi/ghcr-docker-config/config.json`.

## Handoff Rule

After each verified milestone, update `docs/handoff.md` with what was confirmed, what changed, remaining issues, and exact next step.
