# Session Handoff

## Current Goal

System stable and fully deployed. Web dashboard maturing toward end-user access.

## Web Dashboard Claim Device Feature Milestone (2026-06-06)

### What Was Confirmed & Verified
- **Backend API Scoped Sites**: Added role-based `GET /dashboard/sites` in `routes/dashboard.ts` (admins can query all sites or filter by `tenantId`, regular users query sites only inside their own tenant).
- **Frontend API Client Update**: Integrated `Site` type and wrapper functions `api.sites` and `api.claimDevice` in `frontend/src/api.ts`.
- **Claim Device UI Component**: Created `ClaimDeviceModal` in `frontend/src/pages/Devices.tsx` and linked it via a "🔌 Claim Thiết bị" button. Handles regular user forms (scoped to their tenant) and admin forms (unscoped tenant/site/owner user mappings).
- **Clean Local Builds**: Verified local compilation of frontend and backend via typescript compilers. Both built with zero errors.
- **Script Path Migration**: Fixed default deploy/verify directories to point to `/home/technician/...` instead of `/home/tma_agi/...` in `deploy-vps.sh` and `verify-vps.sh`.

### What Changed
- **`backend/src/routes/dashboard.ts`**: Added `GET /sites` endpoint with role-based scoping checks.
- **`frontend/src/api.ts`**: Added `Site` type, `api.sites()`, and `api.claimDevice()` methods.
- **`frontend/src/pages/Devices.tsx`**: Added "Claim Thiết bị" button to page header and fully implemented `ClaimDeviceModal` component.
- **`scripts/deploy-vps.sh`**: Changed default path defaults from `tma_agi` to `technician`.
- **`scripts/verify-vps.sh`**: Changed default path defaults from `tma_agi` to `technician`.
- **`handoff.md`**: Updated the root handoff description.

### Remaining Issues
- None.

### Exact Next Step
- Push code to main to trigger GitHub Actions Docker build, then run pull & restart on the VPS to deploy.

---

## Firmware Fallback IP Update Milestone (2026-06-06)

### What Was Confirmed & Verified
- **Firmware Fallback IP Update**: Updated the default hardcoded MQTT server IP from the old IP (`113.161.220.166`) to the new VPS IP (`167.71.207.5`) across both ESP32 and ESP8266 source directories.
- **Flawless Compilation**: Verified that the modified firmware compiles successfully using PlatformIO for both targets (`esp32doit-devkit-v1` and `nodemcuv2`).
- **Binary Deploy to VPS**: Transferred the new compiled binaries to `/home/technician/esp32_loss_power_deploy/firmware-host/` on the VPS and restarted the python HTTP static server on port `8081` to serve the binaries for OTA updates. Verified URL downloading.
- **Local SSH Config updated**: Configured the local `vps-prod` SSH alias to point directly to the new VPS (`167.71.207.5`) as the `technician` user with the `do_ssh_key` private key.

### What Changed
- **`src/esp32/ConfigManager.cpp`**: Changed default MQTT server IP to `167.71.207.5`.
- **`src/esp32/DataSender.cpp`**: Changed fallback MQTT broker IP to `167.71.207.5`.
- **`src/esp8266/ConfigManager.cpp`**: Changed default MQTT server IP to `167.71.207.5`.
- **`src/esp8266/DataSender.cpp`**: Changed fallback MQTT broker IP to `167.71.207.5`.
- **`C:\Users\technician\.ssh\config`**: Updated `vps-prod` host alias.
- **`docs/handoff.md`**: Prepend this milestone to the top.

### Remaining Issues
- None.

### Exact Next Step
- Advise the user to perform OTA updates or local USB flashing using the compiled binaries.

---

## VPS Restoration & Security Hardening Milestone (2026-06-06)

### What Was Confirmed & Verified
- **SSH Key-Only Hardening**: Configured key-only SSH authentication for user `technician` on the new VPS (`167.71.207.5`). Verified that password login is disabled.
- **Dynamic Path & Container Resolution**: Verified that modified scripts (`restore-meter.sh`, `backup-meter.sh`, `setup-backup-cron.sh`) run correctly on the new VPS by dynamically resolving user home directory ($HOME) and container names (ends with `-mongodb-1` or `_mongodb_1`).
- **Disaster Recovery Restore**: Executed `restore-meter.sh --latest` using the retrieved production `JWT_SECRET` key. Downloaded the latest Google Drive backup, decrypted it, recreated all environment configurations, and successfully restored MongoDB database collections.
- **Test Backup & GDrive Sync**: Executed `backup-meter.sh` successfully on the new VPS. Confirmed that it dumps the restored DB, AES-256 encrypts the archive, and uploads it to Google Drive remote (`tma-agi-backup:esp32_meter`) while applying the 7-day retention cleanup policy.
- **System Health**: All 5 services (`mosquitto`, `mongodb`, `backend`, `frontend`, `assistant-bot`) are running healthy. Backend health status returns `ok` with successful connections to both MQTT and MongoDB.

### What Changed
- **`scripts/restore-meter.sh`**: Updated hardcoded home directories to `$HOME` and added dynamic container name resolution right before database restoration. Added `--` option separator to `grep` pattern checks to prevent option interpretation.
- **`scripts/backup-meter.sh`**: Updated home directories to `$HOME` and added dynamic container name resolution inside the dump step. Added `--` option separator to `grep` patterns.
- **`scripts/setup-backup-cron.sh`**: Modified hardcoded script and log path variables to use `$HOME`.
- **`docs/handoff.md`**: Prepend this milestone to the top of the handoff document.

### Remaining Issues
- None. System is fully operational and database restored on the new VPS.

### Exact Next Step
- Advise the user to access the web dashboard at `http://167.71.207.5:8080` to verify restored devices and historical telemetry.

---

## Web Dashboard IP Display & Firmware OTA Update v1.0.2 Milestone (2026-06-06)

### What Was Confirmed & Verified
- **Frontend Dashboard IP Column**: Added an "Địa chỉ IP" (Internal IP) column directly to the devices tables in both `Dashboard.tsx` and `Devices.tsx`. The IP address is displayed as a link that opens the device web interface in a new tab without opening the details modal.
- **OTA Dropdown Filtering**: Filtered the select version dropdown in the Controls tab to only display releases compatible with the current device's board type (ESP32 for ESP32, ESP8266 for ESP8266), resolving version selection conflict.
- **Backend OTA Request Validation**: Made `actorUserId` optional in the Zod parser schema on `/devices/:deviceId/ota`, resolving the Zod 400 Bad Request error triggered by the dashboard UI.
- **Firmware Version v1.0.2 Build**: Successfully compiled ESP32 and ESP8266 firmwares with `FIRMWARE_VERSION="1.0.2"`.
- **Local Flash via COM3**: Successfully uploaded the firmware v1.0.2 locally over USB serial COM3 to the connected physical ESP32 device.
- **VPS Binary Deployment**: Copied `esp32-meter-1.0.2.bin` and `esp8266-meter-1.0.2.bin` to `/home/tma_agi/esp32_loss_power_deploy/firmware-host/` on the VPS.
- **OTA Job Triggered**: Registered the new firmware releases in MongoDB and triggered OTA updates for active devices (`7B34E3EC` & `004A936C`). ESP32 device confirmed transition to `received` -> `downloading`.

### What Changed
- **`backend/src/types.ts`**: Made `actorUserId` optional in `otaReleaseRequestSchema`.
- **`frontend/src/api.ts`**: Added `boardType` to `Device` type definition.
- **`frontend/src/pages/Dashboard.tsx`**: Added IP address column with link click propagation handling.
- **`frontend/src/pages/Devices.tsx`**: Added IP address column to list view, defined `filteredReleases` to filter releases dynamically, and updated selection dropdown rendering.
- **`handoff.md`**: Updated the root handoff description.

### Remaining Issues
- None.

### Exact Next Step
- Push code to origin, pull the updated frontend image on VPS, and verify telemetry reports of the devices running firmware `1.0.2`.

---

## Web Dashboard Monthly & Custom Range Analytics Milestone (2026-06-06)

### What Was Confirmed & Verified
- **Custom Range Daily Breakdown**: Generalized `getPeakDayLast7Days` to `getPeakDayAnalytics` inside `analytics.repo.ts` to compute daily rollups dynamically for any `EnergyRangeOptions` range.
- **Param-Driven Endpoint**: Exposed parameters (`preset`, `startDate`, `endDate`) on `/devices/:deviceId/analytics/peak-day` endpoint in `routes/devices.ts`.
- **Dynamic Frontend Selection Panel**: Built range selectors in the **Analytics** tab of the `DeviceDetail` modal (`Devices.tsx`) showing presets (7 days, this month, last month) and custom date calendar pickers.
- **Successful Builds**: Verified that both backend and frontend compile with zero errors in production configuration.

### What Changed
- **`backend/src/db/analytics.repo.ts`**: Implemented `getPeakDayAnalytics` and updated `getPeakDayLast7Days` to use it.
- **`backend/src/mongodb.ts`**: Exposed `getPeakDayAnalytics` delegate.
- **`backend/src/routes/devices.ts`**: Added query parameter checks and error handler to the peak-day endpoint.
- **`frontend/src/api.ts`**: Modified `peakDay` client method to append range options to query string.
- **`frontend/src/pages/Devices.tsx`**: Added selector states, `fetchDailyEnergy` function, and a dynamic control panel in the analytics tab layout.
- **`handoff.md`**: Created the project handoff description at root.

### Remaining Issues
- None.

### Exact Next Step
- Deploy the updated container images to the VPS and run integration checks on the web UI.

---

## Unified Full Backup & Restore System Milestone (2026-05-23)

### What Was Confirmed & Verified
- **Local Docker Test Suite (WSL)**: Successfully installed Docker/Compose inside WSL Ubuntu, configured a mock `esp32losspowerdeploy_mongodb_1` container, wrote test telemetry data, triggered `backup-meter.sh`, verified AES-256 archive encryption locally, wiped the mock database completely, ran `restore-meter.sh --file <backup>` with dynamic compose resolution, and verified 100% data and configuration recovery with zero errors.
- **Production VPS Backup Execution**: Successfully made remote rclone binary executable (`/home/tma_agi/rclone`), deployed updated scripts, and triggered a live production backup run. Verified that it dumps the production `esp32_power_monitor` database, bundles configurations, encrypts via AES-256, and successfully synchronizes to Google Drive (`tma-agi-backup:esp32_meter`).
- **Production VPS Restore Dry-run**: Executed `restore-meter.sh --list` on VPS, confirming that it can successfully discover and list remote encrypted backups from Google Drive.
- **Crontab Scheduling**: Ran `setup-backup-cron.sh` on the VPS to automatically clean up obsolete local-only backup scripts and register the new unified backup schedule (daily at 03:00 AM) with automatic 7-day retention checks.

### What Changed
- **`scripts/backup-meter.sh`** [NEW]: Script for database dumping, configuration gathering, AES-256 encryption, rclone cloud synchronization, and 7-day local/remote cleanup. Gracefully handles root-owned system files.
- **`scripts/restore-meter.sh`** [NEW]: Script for automated disaster recovery, support local-offline restore fallbacks, dynamic compose version resolvers (`docker compose` vs `docker-compose`), container recreation, and database restoration.
- **`scripts/setup-backup-cron.sh`** [NEW]: Automated cron installer that updates the crontab in an idempotent way.
- **`docs/backup-restore-guide.md`** [NEW]: Detailed step-by-step disaster recovery manual in Vietnamese for spinning up and restoring a new VPS from scratch.

### Remaining Issues
- None. System backup & restore capability is fully completed, tested, and automated.

### Exact Next Step
- Advise the user to secure their encryption passphrase (`JWT_SECRET` or custom `BACKUP_PASSPHRASE` from `.env.prod`) which is essential for decrypting backups in a complete disaster recovery scenario.

---

## Web Dashboard Security Scoping & Device Renaming Milestone (2026-05-23)

### What Was Confirmed & Verified
- **Backend Security Scoping**: Successfully mounted `/devices`, `/ota`, `/admin`, and `/internal` behind `authMiddleware` inside [http.ts](file:///c:/local/opencode/iot/esp32_loss_power/backend/src/http.ts) to resolve public access vulnerabilities.
- **Inter-service Secrets**: Enabled `X-Internal-Key` verification in [auth.ts](file:///c:/local/opencode/iot/esp32_loss_power/backend/src/auth.ts) to permit secure bot-to-backend communication via a shared `JWT_SECRET` key.
- **Device Access Middleware**: Implemented `checkDeviceAccess` in [devices.ts](file:///c:/local/opencode/iot/esp32_loss_power/backend/src/routes/devices.ts), strictly blocking regular users from viewing or controlling devices outside their assigned tenant.
- **Device Renaming**: Programmed friendly display name updates in `DeviceRepo` ([device.repo.ts](file:///c:/local/opencode/iot/esp32_loss_power/backend/src/db/device.repo.ts)) with automated auditable events logged in `audit_events`.
- **UI Renaming Panel**: Redesigned the header inside `DeviceDetail` in [Devices.tsx](file:///c:/local/opencode/iot/esp32_loss_power/frontend/src/pages/Devices.tsx) with a sleek inline toggle input, including state synchronization back to the lists in `Devices.tsx` and `Dashboard.tsx` dynamically.
- **Production Build and Deploy**: Both frontend and backend compile cleanly under production configurations, built successfully, and deployed on the VPS via `docker-compose`. Live health is 100% OK.

### What Changed
- **`backend/src/routes/devices.ts`**: Added middleware `checkDeviceAccess`, put endpoint `PUT /:deviceId` for renaming, cast parameter calls to resolve compiler type conflicts in Express 5.
- **`frontend/src/api.ts`**: Added `renameDevice` method inside `api` client.
- **`frontend/src/pages/Devices.tsx`**: Added editing states, `handleRename`, keyboard shortcut listener, updated modal header, and set parent synchronization callback.
- **`frontend/src/pages/Dashboard.tsx`**: Injected name sync callback when triggering the modal.

### Remaining Issues
- None. All security and renaming objectives are completely implemented and verified in production.

### Exact Next Step
- Provide the user with details about how to test the security boundaries and rename claimed devices on the live web dashboard.

---

## ESP8266 OTA Verification Milestone (2026-05-22 — Part 3)

### What Was Confirmed & Verified
- Quá trình nâng cấp firmware từ xa qua mạng (OTA) trên thiết bị ESP8266 thực tế thành công rực rỡ và hoạt động ổn định.
- Firmware version `1.0.1` biên dịch thành công cho board ESP8266 (`nodemcuv2`).
- Kích hoạt OTA thành công thông qua API của backend `POST /ota/jobs` với payload JSON:
  `{"job_id":"ef89fc31-636a-4501-ad68-0ed04a6487a1","device_id":"004A936C","serial_number":"004A936C","version":"1.0.1","url":"http://113.161.220.166:8080/esp8266-meter-1.0.1.bin"}`
- Thiết bị ESP8266 nhận lệnh qua MQTT channel `firmwareUpdateOTA/device/004A936C`, tự động gửi telemetry OTA thành `received` -> `downloading`, tải xuống firmware `.bin` từ Nginx static server trên port `8080` của VPS và tự động flash thành công.
- Thiết bị tự động khởi động lại, khôi phục cấu hình WiFi và MQTT thành công, tự động gửi dữ liệu telemetry mới nhất lên MQTT Broker với thông tin phiên bản mới: `"firmware_version":"1.0.1"`.

### What Changed
- **`platformio.ini`**: Khôi phục lại cấu hình `-D FIRMWARE_VERSION` trong `platformio.ini` về trạng thái mặc định của codebase (sẽ tự động lấy `"1.0.0"` từ `DataSender.cpp` khi build local) nhằm đảm bảo sự gọn gàng và độc lập trong các bản build tiếp theo.
- **Tập tin tạm thời**: Dọn dẹp task serial monitor `task-522` (COM3) sau khi quá trình log OTA hoàn thành.

### Remaining Issues
- Không có. Tính năng OTA cho ESP8266 đã chạy cực kỳ mượt mà và tương thích tốt với luồng server giống như ESP32.

### Exact Next Step
- Người dùng có thể tiếp tục giám sát dữ liệu telemetry đẩy về Dashboard và VPS từ thiết bị ESP8266 phiên bản `1.0.1` vừa được nâng cấp qua OTA.

### Relevant Log Evidence
- Serial monitor log khi OTA thành công:
```
Message arrived [firmwareUpdateOTA/device/004A936C] {"job_id":"ef89fc31-636a-4501-ad68-0ed04a6487a1",...}
Received OTA update command
Starting OTA update from URL: http://113.161.220.166:8080/esp8266-meter-1.0.1.bin
Cập nhật thành công! Đang khởi động lại...
...
Config loaded successfully
✅ WiFi connected successfully!
Attempting MQTT connection...connected
Data sent to MQTT: {"serial_number":"004A936C","device_id":"004A936C",...,"firmware_version":"1.0.1",...}
```

---

## Web Dashboard Milestone (2026-05-22 — Part 2)

### What Was Confirmed & Verified
- Frontend premium web dashboard compiles and builds successfully under production settings using Vite with zero TypeScript typecheck errors.
- Visual components fully integrated and layout responsiveness verified.
- Client-side live telemetry aggregates, status filter controls, and OTA controls checked against server schemas.

### What Changed
- **`frontend/src/index.css`**: Configured custom Google Fonts (`Inter`, `Outfit`), beautiful modern HSL variables for dark glassmorphic styling, pulse animations for active statuses, and interactive transitions.
- **`frontend/src/api.ts`**: Introduced `deviceAction`, `deviceOta`, and `releases` client endpoints supporting remote actions.
- **`frontend/src/pages/Devices.tsx`**: Replaced standard structure with complete search filters, a detailed controls tab (Reboot and admin OTA version selection), Vietnamese labels matching bot standards, and cosmetic hour mapping normalizations for Recharts hourly charts.
- **`frontend/src/pages/Dashboard.tsx`**: Upgraded layout to display live stats aggregations (total active power, total current, average voltage across all online devices) along with an interactive progress ratio indicator and fleet table quick-launch modal triggers.
- **`frontend/src/App.tsx`**: Injected user session objects as standard props into `<Dashboard user={user} />` and `<Devices user={user} />`.

### Remaining Issues
- None. All typescript and bundling steps are 100% complete and exit code is 0.

### Exact Next Step
- Run standard Git commit & push, and run deployment commands to VPS to deploy the new dashboard interface.

### Relevant Build Evidence
- **TypeScript compile check**: `node.exe node_modules/typescript/bin/tsc -b` -> PASS (Exit: 0)
- **Vite production bundle**: `node.exe node_modules/vite/bin/vite.js build` -> PASS (Exit: 0)

---

## Session Delta (2026-05-22 — Part 1)

### What Changed

1. **ESP8266 (NodeMCU v2) integration into the Single Codebase** (completed, verified, uploaded to device)
   - Updated `platformio.ini` to add the `[env:nodemcuv2]` environment, configuring appropriate libraries (`SoftwareSerial`, `LittleFS`, `ESP8266WiFi`, `ESP8266WebServer`, etc.) and the `-D BOARD_TYPE` build flag.
   - Updated `include/Meter.h` and `src/Meter.cpp` to use `SoftwareSerial` (virtual RX=GPIO12, TX=GPIO13) specifically for the ESP8266, while retaining `HardwareSerial` for ESP32.
   - Updated `include/WebConfig.h` to define dynamic `WebServer` routing using `ESP8266WebServer` for ESP8266 and `WebServer` for ESP32.
   - Updated `src/ConfigManager.cpp` to support ESP8266 chip identification using `ESP.getChipId()` and handle `LittleFS` formatting and initialization compatibility.
   - Updated `include/DataSender.h` and `src/DataSender.cpp` to set MQTT telemetry payloads with `chip_family = ESP8266` and `chip_model = ESP8266EX`, and disabled multi-threaded FreeRTOS tasks (replacing them with synchronous calls in `loop()` for ESP8266).
   - Updated `src/main.cpp` to map PZEM serial pins dynamically based on the board type (`RX_PIN = 12, TX_PIN = 13` for ESP8266, `RX_PIN = 16, TX_PIN = 17` for ESP32).
   - Updated `include/WiFiLedStatus.h` and `src/OTAUpdate.cpp` to resolve ESP8266 compilation conflicts, implementing a macro mapped to `ESPhttpUpdate` to maintain exact backwards compatibility.
   - Fixed missing python dependency in build machine's python environment by installing `intelhex` via pip to resolve PlatformIO's toolchain bootloader packaging failure.

2. **Compilation & Upload Verification**
   - Successfully compiled the firmware for **both** platforms:
     - `pio run -e nodemcuv2` -> **SUCCESS**
     - `pio run -e esp32doit-devkit-v1` -> **SUCCESS** (ensuring complete backwards compatibility)
   - Flashed the compiled binary onto the physical ESP8266 device via **`COM3`** successfully.
   - Monitored the serial logs at `115200` baud: confirmed successful SPIFFS/LittleFS loading, configuration recovery, device registration (`Device ID: 3`, `Serial: SN003`), and starting the captive WiFi Manager portal (`PZEM_Meter_936C`).

### Next Steps

1. Configure WiFi SSID and password via the ESP8266 captive portal (`PZEM_Meter_936C` at `192.168.4.1`) or let it connect to `MAX AUTO` if configured.
2. Confirm the telemetry data from `SN003` is correctly published to the MQTT broker (`113.161.220.166`) and visible in the VPS MongoDB / Web dashboard.
3. Test physical PZEM-004T v3.0 measurements on ESP8266 under load once connected.

## Session Delta (2026-05-21 — part 2)

### What Changed

1. **Analytics charts in device detail modal** (completed, committed `e5ae27f`)
   - `frontend/src/pages/Devices.tsx` — `DeviceDetail` modal now has Info / Analytics tabs
   - Analytics tab: 7-day energy bar chart (`/devices/:serial/analytics/peak-day`) + today's hourly power line chart (`/devices/:serial/analytics/hourly?date=today`)
   - Charts rendered with Recharts (`recharts: ^2.14.1` added to `frontend/package.json`)
   - Data fetched lazily on first tab click; re-use cached on subsequent tab switches
   - New types in `frontend/src/api.ts`: `DayBreakdown`, `PeakDaySummary`, `HourlySlot`, `HourlyBreakdown`
   - Frontend build: 0 errors
   - **Deployed to VPS** — frontend container recreated, HTTP 200 confirmed
   - API endpoints verified: `peak-day` returns `peakDate: "2026-05-14"`, `peakDayEnergyKwh: 13.068`; `hourly` returns hourly buckets with `avgPower` and `energyKwh`

2. **Tenant-scoped dashboard for regular users** (completed, committed `8542c8a`)
   - Problem: all web users (admin and non-admin) saw the full fleet — no tenant filtering
   - `backend/src/auth.ts` — added `tenantId?: string` to `JwtPayload`
   - `backend/src/routes/auth.ts` — login now includes `user.defaultTenantId` as `tenantId` in JWT
   - `backend/src/routes/dashboard.ts` — `GET /stats` and `GET /devices` now branch on `systemRole`:
     - `platform_admin` → full fleet view (unchanged)
     - regular `user` with `tenantId` → `getDevicesForTenant(tenantId)` and tenant-scoped stats
     - regular `user` without `tenantId` → empty response
   - `backend/src/db/user.repo.ts` — `createWebUser()` now accepts `defaultTenantId?: string`
   - `backend/src/mongodb.ts` — delegate updated to pass through `defaultTenantId`
   - `frontend/src/pages/Users.tsx` — Create User modal now shows tenant dropdown when role is "user"; clears tenantId when switching to admin role
   - `frontend/src/api.ts` — `User` type now has `defaultTenantId?: string`; `CreateUserInput` has `tenantId?: string`
   - Both backend + frontend typecheck/build: 0 errors
   - **Pushed to main — CI build pending; not yet deployed**

### Deploy Commands (after CI builds `8542c8a`)

```bash
# Deploy backend + frontend together
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && \
  DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml pull backend frontend && \
  DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml up -d backend frontend"
```

### To Verify After Deploy

1. Login as admin → Users → **+ New User** → Role: User → pick tenant "tenant-default" → Create
2. Login as new user → should see only nhaba device (not all fleet)
3. Click nhaba → Analytics tab → 7-day bar chart + hourly line chart visible
4. Admin login → fleet-wide view unchanged

### Known Minor Issue

`localHour: 24` returned for the midnight bucket (00:00 Vietnam time) — renders as `24:00` in the hourly chart instead of `0:00`. Cosmetic only, data is correct. Fix: normalize `localHour === 24` to `0` in the frontend map.

---

## Session Delta (2026-05-21)

### What Changed

1. **Telegram role-based access control** (completed, committed `c3e4a5c`)
   - Replaced flat `canManageDevice()` (any tenant member could do anything) with role-aware gates:
     - `reboot` → `site_operator` or `tenant_admin` within tenant, or `platform_admin`
     - `remove` → `tenant_admin` within tenant, or `platform_admin`
     - `factory_reset` → `platform_admin` only
     - `/ota_update` → `platform_admin` only
   - New functions in `assistant-bot/src/device-resolver.ts`: `canPerformDeviceAction(action, identifier, defaultTenantId, memberships)` and `canPerformOta(memberships)`
   - Updated `handlers/commands.ts` and `handlers/device.ts` to use new functions
   - Action-specific denial messages in Vietnamese
   - TypeScript typecheck: 0 errors
   - Pushed to main — awaiting deploy

2. **New analytics intents: `get_peak_day` and `get_hourly_breakdown`** (completed, committed `e088d6b`)
   - **`get_peak_day`** — "Ngày nào trong tuần dùng nhiều điện nhất?"
     - Backend: `GET /devices/:id/analytics/peak-day` in `backend/src/routes/devices.ts`
     - Repo method `getPeakDayLast7Days()` in `analytics.repo.ts` — runs 7 local-day boundary-based segments in parallel via `Promise.all`, returns peak date + daily breakdown
     - Bot: intent in `groq.ts`, fallback keyword rule (`ngay nao + tuan + asksEnergy`), handler branch in `handlers/analytics.ts`
   - **`get_hourly_breakdown`** — "Cho mình bảng điện theo giờ hôm nay"
     - Backend: `GET /devices/:id/analytics/hourly?date=today|yesterday|YYYY-MM-DD`
     - Repo method `getHourlyBreakdown()` — queries `telemetry_hourly` collection directly, maps `localHour` from `getTimeZoneParts`
     - Bot: intent with `targetDate` field in schema, fallback keyword rule (`theo gio/bang gio/hourly`), handler branch + table formatter
   - 7 files changed: `backend/src/db/types.ts`, `analytics.repo.ts`, `routes/devices.ts`, `mongodb.ts`, `assistant-bot/src/backend-client.ts`, `groq.ts`, `handlers/analytics.ts`
   - Both backend + assistant-bot typecheck: 0 errors
   - Pushed to main — awaiting deploy

### Deploy Commands (after CI builds images)

```bash
# Deploy backend
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && \
  DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml pull backend && \
  DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml up -d backend"

# Deploy assistant-bot
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && \
  DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml pull assistant-bot && \
  DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config docker-compose -f docker-compose.deploy.yml up -d assistant-bot"
```

### To Verify After Deploy

- `ssh vps-prod "curl -sS http://127.0.0.1:3000/devices/7B34E3EC/analytics/peak-day"` — should return JSON with `peakDate` and `dailyBreakdown`
- `ssh vps-prod "curl -sS http://127.0.0.1:3000/devices/7B34E3EC/analytics/hourly?date=today"` — should return JSON with `hours` array
- Bot: send "Ngày nào trong tuần dùng nhiều điện nhất?" → expect peak day response
- Bot: send "Cho mình bảng điện theo giờ hôm nay" → expect hourly table

---

## Session Delta (2026-05-20)

### What Changed

1. **`assistant-bot/src/index.ts` split into focused modules** (completed, deployed)
   - `index.ts` (1494 lines) → 8 modules + thin 144-line main loop:
     - `formatters.ts` — all format* functions, previewText, getActionLabel
     - `nlu.ts` — normalizeVietnameseText and all parse*/looksLike* (pure functions, no I/O)
     - `session.ts` — PendingState type + getPendingState/setPendingState/clearPendingState
     - `device-resolver.ts` — isPlatformAdmin, resolveAccessibleDevice, canManageDevice
     - `handlers/analytics.ts` — handleAnalyticsQuestion
     - `handlers/device.ts` — handleDeviceDetailQuestion, handleFirmwareVersionQuestion, handleNaturalLanguageDeviceAction, handleInventoryQuestion
     - `handlers/pending.ts` — ensureDefaultTenant, handleClaimFlow, handleDeviceActionConfirmation, handleOtaConfirmation
     - `handlers/commands.ts` — handleCommand, handleNaturalLanguage dispatch
   - `telegram.ts` updated: now exports logged `sendMessage` (was raw API only)
   - Fixed pre-existing `groq.ts` bug: missing `content:` key on system message in `parseInventoryIntent`
   - TypeScript typecheck: 0 errors
   - Deployed to VPS: CI built image, pulled and restarted — confirmed healthy

2. **Fixed pre-existing UTF-8 encoding bug in `groq.ts`** (completed, deployed)
   - 19 Vietnamese string literals in `buildAnalyticsFacts()` and `fallbackParseInventoryIntent()` were triple-encoded (UTF-8 bytes re-encoded twice as CP1252)
   - Caused garbled text in all Telegram responses (e.g. `Ä'iá»‡n Ã¡p` instead of `điện áp`)
   - Also broke pattern matching in `fallbackParseInventoryIntent` — Vietnamese keyword checks never matched
   - Fixed by writing correct UTF-8 bytes directly via Python byte-level replacement
   - TypeScript typecheck: 0 errors

### Confirmed Working After Deploy

- assistant-bot container started cleanly, 0 errors in logs
- All 5 containers remain Up
- Vietnamese text in bot responses now renders correctly

---

## Session Delta (2026-05-19 — part 3)

### What Changed

1. **`http.ts` split into route modules** (completed)
   - `backend/src/http.ts` (monolith) → thin orchestrator + 6 route files:
     - `routes/auth.ts` — `/auth/login`, `/auth/me`
     - `routes/dashboard.ts` — `/dashboard/*` (JWT-protected)
     - `routes/devices.ts` — `/devices/*`
     - `routes/ota.ts` — `/ota/jobs/*`
     - `routes/admin.ts` — `/admin/*`
     - `routes/internal.ts` — `/internal/*` (bot-to-backend)
     - `routes/utils.ts` — shared `parseLimit()` helper
   - Fixed `@types/express@5` multi-middleware typing: `String(req.params.xxx)` where needed

2. **`mongodb.ts` split into domain repository classes** (completed, deployed)
   - `backend/src/mongodb.ts` (2377 lines) → 10 files under `backend/src/db/`:
     - `db/types.ts` — all exported record types
     - `db/analytics.ts` — pure timezone/energy math (no DB access)
     - `db/device.repo.ts` — `DeviceRepo`: device CRUD, claim/unclaim, commands
     - `db/telemetry.repo.ts` — `TelemetryRepo`: ingest, device-state, rollup, offline tracking
     - `db/ota.repo.ts` — `OtaRepo`: OTA jobs, firmware releases, policy evaluation
     - `db/user.repo.ts` — `UserRepo`: web users, Telegram identity, memberships
     - `db/tenant.repo.ts` — `TenantRepo`: tenants, sites
     - `db/alert.repo.ts` — `AlertRepo`: alert events, notification queue
     - `db/bot.repo.ts` — `BotRepo`: bot sessions
     - `db/analytics.repo.ts` — `AnalyticsRepo`: daily summary, energy analytics
   - `mongodb.ts` is now a thin orchestrator (~170 lines of one-liner delegates)
   - All existing imports (`from "./mongodb"`, `from "../mongodb"`) unchanged via re-exports
   - TypeScript typecheck: 0 errors
   - Deployed to VPS: CI built new image, pulled and restarted — confirmed healthy

### Confirmed Working After Deploy

- All 5 containers Up (no restarts)
- Healthz: `{"status":"ok","mqttConnected":true,"mongodbConnected":true}`
- Backend uptime resumed cleanly after container recreation

---

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

1. **Deploy this session's commits** — CI builds pending for `c3e4a5c` (role scoping) and `e088d6b` (analytics); pull + restart both backend and assistant-bot on VPS once CI passes.
2. **Verify new analytics endpoints** after deploy — curl `peak-day` and `hourly` for device `7B34E3EC`.
3. **Optional**: `/peak_day` for specific date range (currently hardcoded to last 7 local days).
4. **Optional**: Frontend dashboard analytics panel — surface `peak-day` and `hourly` data visually.

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

## Last Verified Result (2026-05-21)

- TypeScript typecheck: 0 errors on both backend and assistant-bot after all 2026-05-21 changes
- Commits `c3e4a5c` and `e088d6b` pushed to main; CI build in progress
- VPS not yet updated with this session's changes — deploy pending CI

### Carried Forward (last confirmed on VPS)
- All 5 containers Up (mosquitto, mongodb, backend, assistant-bot, frontend), 0 restarts
- Backend healthz: `{"status":"ok","mqttConnected":true,"mongodbConnected":true}`
- Vietnamese text in bot responses renders correctly
- Device `7B34E3EC` (nhaba): online, firmware `1.0.1`, sending telemetry
