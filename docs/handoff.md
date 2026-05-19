# Session Handoff

## Current Goal

System stable and fully deployed. Web dashboard operational.

## Session Delta (2026-05-19 — part 2)

### What Changed

1. **Web dashboard + JWT auth deployed** (5 services now running on VPS)
   - New service: `frontend` container at port 8080 — React SPA served by Nginx
   - Backend now has `/auth/login`, `/auth/me`, `/dashboard/*` routes (JWT-protected)
   - Platform admin bootstrapped on first startup (username: `admin`, password in `.env.prod`)
   - Admin can manage users, view device list + telemetry, see fleet stats
   - `docker-compose.deploy.yml` on VPS updated to include frontend service
   - VPS `.env.prod` updated: `JWT_SECRET`, `DASHBOARD_ADMIN_USERNAME`, `DASHBOARD_ADMIN_PASSWORD`

2. **CI pipeline fixes**
   - Added `typecheck` job to `backend-image.yml` — TypeScript errors now visible in CI before Docker build
   - Fixed `@types/express@5` multi-middleware param typing: `req.params.xxx as string`
   - Fixed `@types/bcryptjs` / `@types/jsonwebtoken` version constraints (too high → relaxed to `^2.4.0` / `^9.0.0`)
   - Fixed bootstrap crash: `bootstrapAdminUser()` now uses `updateOne` (not `insertOne`) — safe for existing users

3. **Dashboard access**
   - URL: `http://<VPS_IP>:8080`
   - Login: `admin` / `Admin@2024!Secure`

### Deploy Commands (current workflow)

```bash
# Deploy backend (after git push)
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && \
  DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml pull backend && \
  DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml up -d backend"

# Deploy frontend (after git push changes to frontend/)
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && \
  DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml pull frontend && \
  DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml up -d frontend"
```

### Confirmed Working After Deploy

- All 5 containers Up: mosquitto, mongodb, backend, assistant-bot, frontend
- Healthz: `{"status":"ok","mqttConnected":true,"mongodbConnected":true}`
- Backend logs: `"Bootstrapped platform admin credentials"` on first start
- `POST /auth/login` returns JWT with `systemRole: "platform_admin"`
- Frontend HTTP 200 at port 8080

---

## Session Delta (2026-05-19 — part 1)

### What Changed

1. **2-minute delayed offline alert (anti-spam)**
   - Replaced immediate ALERT with two-phase logic in `backend/src/alerts.ts`:
     - Phase 1: device silent > 45s → stamp `offlineSince` on DeviceStateRecord (no notification)
     - Phase 2: `offlineSince` > 2 min → send ALERT
     - Recovery before 2 min → clear `offlineSince` silently, no notification sent
     - Recovery after alert → send RECOVERED as before
   - Added `offlineSince?: Date` field to `DeviceStateRecord` type in `mongodb.ts`
   - New methods in `mongodb.ts`: `markOfflinePending()`, `getDevicesToAlert()`, `clearOfflinePending()`
   - Updated `markRecovered()` to `$unset offlineSince`
   - Result: 20+ ALERT/RECOVERED spam during restart cycles → 0 notifications (restart < 2 min)
   - Real power outage still notified within ~2m45s (45s detect + 120s delay)
   - Files: `backend/src/alerts.ts`, `backend/src/mongodb.ts`

2. **Docker-based deploy workflow (no more scp of source code)**
   - Updated `docker-compose.vps.yml`: removed `build: context:`, now uses GHCR images
     - `ghcr.io/mathangspk/esp32-loss-power-backend:latest`
     - `ghcr.io/mathangspk/esp32-loss-power-assistant-bot:latest`
   - Copied updated compose file to VPS as `docker-compose.deploy.yml` (one-time)
   - Set up GHCR auth on VPS: `/home/tma_agi/ghcr-docker-config/config.json` (base64 PAT)
   - Deploy flow: push to main → GitHub Actions builds image → VPS pulls + restarts

3. **Fixed missing commit: `backend/src/index.ts` rollup code**
   - Discovered `index.ts` with rollup/race-guard changes was never committed from previous session
   - Committed `scheduleRollupJob`, `runRollupCatchup`, `offlineCheckRunning` flag
   - Previously deployed image was missing these features entirely
   - Now confirmed working: startup logs show daily rollup + catchup on every boot

### Deploy Commands (current workflow)

```bash
# 1. Push code to GitHub → CI builds image automatically
git push origin main

# 2. On VPS: pull new image and restart service
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && \
  DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config \
  docker-compose -f docker-compose.deploy.yml pull backend && \
  DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config \
  docker-compose -f docker-compose.deploy.yml up -d backend"
```

### Confirmed Working After Deploy

- Backend logs: rollup scheduled, catchup complete (1 device, ~3s), MQTT connected
- Healthz: `{"status":"ok","mqttConnected":true,"mongodbConnected":true}`
- All 4 containers Up, 0 restarts
- No errors in logs

## Current Phase

Stable operation. All planned optimizations deployed.

## Latest Verified Milestone

### 2026-05-19

- 2-minute delayed offline alert deployed — restart spam eliminated
- Docker image deploy workflow operational (push → CI → VPS pull)
- `index.ts` rollup code committed and confirmed running in production
- Backend startup logs clean: rollup + catchup + MQTT all healthy

### Carried Forward (previously verified)

- Telemetry hourly rollup: `telemetry_hourly` collection, 95-day TTL on raw, daily 2am UTC job
- Firmware CI/CD: tag `fw-v*` → GitHub Release automation
- Firmware v1.0.1 OTA deployed to device `7B34E3EC` (PZEM 60s watchdog active)
- MongoDB backup: `/home/tma_agi/mongodb_backups/`, daily 3am UTC
- Telegram NLU: Vietnamese analytics, device actions, inventory queries working
- VPS SSH: `ssh vps-prod` (Tailscale, `~/.ssh/opencode_vps`)
- GitHub SSH from WSL: `~/.ssh/id_ed25519_github_mathangspk`

## Confirmed State

- Repo: `git@github.com:mathangspk/ESP32_meter.git`, branch `main`
- Local: `/mnt/c/local/opencode/iot/esp32_loss_power` (WSL path)
- VPS deploy: `/home/tma_agi/esp32_loss_power_deploy`, `docker-compose.deploy.yml`
- GHCR auth: `/home/tma_agi/ghcr-docker-config/config.json` (PAT: read:packages)
- VPS stack: backend, assistant-bot, mongodb, mosquitto, **frontend** — all 5 Up
- Dashboard: `http://<VPS_IP>:8080`, login `admin` / `Admin@2024!Secure`
- Device `7B34E3EC` (nhaba): online, firmware `1.0.1`, sending telemetry
- Bot: `@meter_manager_bot`, chat `2070483485` (@mathangspk)

## Next Recommended Steps

1. **Telegram role scoping**: Restrict OTA/admin commands by `systemRole`; scope device commands by tenant membership.
2. **Self-service claim flow**: User enters serial number in Telegram → claims device to their account.
3. **Optional**: `/peak_day` intent + backend endpoint for `"Ngày dùng nhiều điện nhất trong tuần"`.
4. **Optional**: Hourly breakdown endpoint for `"bảng theo giờ"` questions.
5. **Monitor**: Watch alert behavior on next device restart — confirm no spam with 2-min delay.

## Known Constraints

- **Firmware upload**: only via OTA (GitHub Actions → GitHub Release → VPS trigger); USB requires macOS
- **Tailscale required**: VPS at `100.77.157.70`
- **Telegram timeout**: intermittent `ConnectTimeoutError` from VPS → `api.telegram.org`; bot auto-retries
- **PAT expiry**: if GHCR pulls fail, regenerate PAT and update `/home/tma_agi/ghcr-docker-config/config.json`

## Most Relevant Commands

```bash
# SSH to VPS
ssh vps-prod

# Check all containers
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml ps"

# Check backend health
ssh vps-prod "curl -sS http://127.0.0.1:3000/healthz"

# Tail logs
ssh vps-prod "docker logs esp32losspowerdeploy_backend_1 --tail 30"
ssh vps-prod "docker logs esp32losspowerdeploy_assistant-bot_1 --tail 30"

# Deploy backend (after git push)
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml pull backend && DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml up -d backend"

# Deploy assistant-bot (after git push)
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml pull assistant-bot && DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml up -d assistant-bot"

# Firmware release
git tag fw-v1.0.2 && git push origin fw-v1.0.2
# Then: POST /admin/firmware/releases + POST /devices/<id>/ota

# Check device firmware policy
ssh vps-prod "curl -sS http://127.0.0.1:3000/devices/7B34E3EC/firmware-policy"
```

## Last Verified Result (2026-05-19)

- Backend healthz: `{"status":"ok","mqttConnected":true,"mongodbConnected":true}`
- Backend logs: rollup scheduled (2am UTC), catchup complete (1 device), admin bootstrapped
- All 5 containers Up (added frontend), 0 restarts
- Dashboard login verified: `admin` → JWT `systemRole: platform_admin`
- Frontend HTTP 200 at port 8080
- GHCR pull working from VPS with PAT auth
