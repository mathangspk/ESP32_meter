# Session Handoff

## Current Goal

System is stable. Next priority: add alert cooldown to prevent offline/online spam when device restarts repeatedly.

## Session Delta (2026-05-18)

### What Changed

1. **MongoDB telemetry downsampling (hourly rollup)**
   - Added `telemetry_hourly` collection: hourly aggregates kept forever
   - `telemetry` collection: raw 10s data, TTL index 95 days
   - `rollupOneHour()` — MongoDB `$sort → $group` aggregation per UTC hour
   - `resolveBoundaryTelemetry()` extended with third fallback: `getHourlyBoundary()` (2-hour gap tolerance) → mode `"hourly_fallback"`
   - `computeEnergyForRange()` parallelized with `Promise.all` across segments
   - Startup catchup: processed last 95 days on every boot (idempotent, ~6 seconds for 481 hours)
   - Daily rollup job at 2am UTC via recursive `setTimeout`
   - Files: `backend/src/mongodb.ts`, `backend/src/index.ts`

2. **Backend reliability fixes**
   - Race condition guard on `checkOfflineDevices`: `offlineCheckRunning` flag prevents concurrent runs
   - Notification retry: `getPendingNotifications` now fetches `status: "failed"` with `attemptCount < 3` in addition to pending
   - Files: `backend/src/index.ts`, `backend/src/mongodb.ts`

3. **PZEM watchdog in firmware**
   - Added 60-second NaN watchdog in `src/main.cpp`: if PZEM returns NaN continuously for 60s → `ESP.restart()`
   - Prevents silent data gaps after PZEM module power glitch
   - Deployed via OTA (see below)

4. **Firmware CI/CD pipeline (GitHub Actions)**
   - `.github/workflows/firmware-release.yml` — triggers on `fw-v*` tag push
   - PlatformIO build with `PLATFORMIO_BUILD_FLAGS=-DFIRMWARE_VERSION=\"<version>\"` injected from tag
   - Creates GitHub Release with `firmware-<version>.bin` attached
   - Requires `permissions: contents: write` (added after first failure)

5. **Firmware v1.0.1 deployed via OTA**
   - Tagged `fw-v1.0.1` → CI built and published GitHub Release
   - Registered in backend: `POST /admin/firmware/releases`
   - OTA triggered: `POST /devices/7B34E3EC/ota` → `published → received → downloading → success` in ~23 seconds
   - Device now reports `currentVersion: 1.0.1`, `updateAvailable: false`

6. **MongoDB backup**
   - Script: `/home/tma_agi/backup-mongodb.sh` — mongodump → tar.gz → 7-day rotation
   - Crontab: `0 3 * * *` (3am UTC daily)
   - Tested: 5.5MB backup created successfully

7. **WSL GitHub SSH access**
   - Copied `id_ed25519_github_mathangspk` from Windows to WSL `~/.ssh/`
   - Added `github.com` to `known_hosts` via `ssh-keyscan`

### Confirmed Working After Deploy

- Backend: all 4 containers Up, healthz `{"status":"ok"}`
- Rollup catchup: completed in ~4 seconds on backend restart
- OTA pipeline: end-to-end verified, device flashed in 23s
- Device `7B34E3EC` (nhaba): online, `currentVersion: 1.0.1`

### Issues Found in Log Review

| Issue | Severity | Status |
|-------|----------|--------|
| ALERT/RECOVERED spam (17/5 01:14–02:03 UTC, ~20 alerts in 90 min) | Medium | Root cause: old firmware crashing on PZEM NaN → rapid restarts. Watchdog in v1.0.1 should reduce frequency. **Fix needed: alert cooldown** |
| Telegram `ConnectTimeoutError` to `api.telegram.org` | Low | Intermittent VPS network issue. Bot auto-retries. No fix available. |
| `ECONNREFUSED` during backend redeploy | Low | Transient — assistant-bot can't reach backend during 30-second restart window. Self-resolves. |

## Current Phase

Stable operation. Monitoring + incremental hardening.

## Latest Verified Milestone

### 2026-05-18

- Telemetry hourly rollup deployed and running on VPS (481 hours processed at startup)
- Firmware CI/CD: tag `fw-v*` → GitHub Release automation working
- Firmware v1.0.1 OTA deployed to device `7B34E3EC` — PZEM watchdog active
- All containers healthy post-deploy
- MongoDB backup cron running daily at 3am UTC

### Carried Forward (previously verified)

- VPS SSH access from WSL: `ssh vps-prod` (Tailscale, `~/.ssh/opencode_vps`)
- GitHub SSH from WSL: `~/.ssh/id_ed25519_github_mathangspk`
- Backend boundary-based energy analytics verified
- PZEM telemetry → MQTT ingest → MongoDB working
- Telegram NLU: Vietnamese analytics, device actions, inventory queries working
- Groq llama-3.1-8b-instant fallback NLU active

## Confirmed State

- Repo: `git@github.com:mathangspk/ESP32_meter.git`, branch `main`
- Local: `/mnt/c/local/opencode/iot/esp32_loss_power` (WSL path)
- VPS deploy: `/home/tma_agi/esp32_loss_power_deploy`, `docker-compose.deploy.yml`
- VPS stack: backend (127.0.0.1:3000), assistant-bot, mongodb, mosquitto — all Up
- Device `7B34E3EC` (nhaba): online, firmware `1.0.1`, sending telemetry
- Bot: `@meter_manager_bot`, chat `2070483485` (@mathangspk)
- Groq: llama-3.1-8b-instant
- MongoDB backup: `/home/tma_agi/mongodb_backups/`, daily 3am UTC

## Next Recommended Steps

1. **Alert cooldown** — most important UX fix. Add a cooldown so a second ALERT is not sent if an ALERT was already sent within 10 minutes for the same device. Prevents spam during repeated device restarts.
   - File: `backend/src/alerts.ts` — check last notification timestamp before queuing a new one
   - Or: `backend/src/mongodb.ts` — track `lastAlertSentAt` per device

2. **Verify alert cooldown on next device restart** — watch `assistant-bot` logs to confirm no spam.

3. **Optional**: `/peak_day` intent + backend endpoint for `"Ngày dùng nhiều điện nhất trong tuần"`.

4. **Optional**: Hourly breakdown endpoint for `"bảng theo giờ"` questions.

## Known Constraints

- **Local environment**: no `npm`, `docker`, `node` on Windows; all build/deploy via VPS SSH
- **Firmware upload**: only via OTA (GitHub Actions → GitHub Release → backend trigger); USB upload requires macOS
- **Tailscale required**: VPS Tailscale IP `100.77.157.70`
- **Telegram timeout**: intermittent `ConnectTimeoutError` from VPS to `api.telegram.org`; bot auto-retries
- **Alert spam risk**: rapid device restarts still trigger ALERT/RECOVERED pairs until cooldown is implemented

## Most Relevant Commands

```bash
# SSH to VPS
ssh vps-prod

# Check all container status
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && DOCKER_CONFIG=/home/tma_agi/empty-docker-config docker-compose -f docker-compose.deploy.yml ps"

# Check backend health
ssh vps-prod "curl -sS http://127.0.0.1:3000/healthz"

# Tail backend logs
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && DOCKER_CONFIG=/home/tma_agi/empty-docker-config docker-compose -f docker-compose.deploy.yml logs --tail=50 backend"

# Tail bot logs
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && DOCKER_CONFIG=/home/tma_agi/empty-docker-config docker-compose -f docker-compose.deploy.yml logs --tail=50 assistant-bot"

# Rebuild and restart a service
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && DOCKER_CONFIG=/home/tma_agi/empty-docker-config docker-compose -f docker-compose.deploy.yml up -d --build <service>"

# Check device firmware policy
ssh vps-prod "curl -sS http://127.0.0.1:3000/devices/7B34E3EC/firmware-policy"

# Register new firmware release
ssh vps-prod "curl -s -X POST http://127.0.0.1:3000/admin/firmware/releases -H 'Content-Type: application/json' -d '{\"version\":\"<ver>\",\"severity\":\"recommended\",\"supportStatus\":\"supported\",\"url\":\"<url>\"}'"

# Trigger OTA update
ssh vps-prod "curl -s -X POST http://127.0.0.1:3000/devices/7B34E3EC/ota -H 'Content-Type: application/json' -d '{\"version\":\"<ver>\",\"actorUserId\":\"admin\"}'"

# Firmware release CI: push a tag to trigger build
git tag fw-v1.0.2 && git push origin fw-v1.0.2
```

## Last Verified Result (2026-05-18)

- Backend healthz: `{"status":"ok","mqttConnected":true,"mongodbConnected":true}`
- OTA v1.0.1: `success` in 23 seconds
- Device firmware: `currentVersion: 1.0.1`, `updateAvailable: false`
- Rollup catchup: 481 hours processed in ~4 seconds
- GitHub Actions firmware build: passing
- MongoDB backup: 5.5MB, daily cron confirmed
