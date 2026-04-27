# Backend Local Test

## Prerequisites

- Docker Desktop or another Docker-compatible runtime installed locally
- If using `colima` on macOS, start it first with `colima start`
- Telegram bot token and chat ID for live delivery checks
- `infra/mosquitto/passwd` created with a real MQTT username/password

## Setup

1. Copy `backend/.env.example` to `backend/.env.local`.
2. Fill in `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
3. Keep `MQTT_URL=mqtt://mosquitto:1883` and `MONGODB_URI=mongodb://mongodb:27017` for the local stack.
4. Fill `MQTT_USERNAME` and `MQTT_PASSWORD` with same values used to generate `infra/mosquitto/passwd`.
5. Placeholder Telegram values are enough to verify MongoDB state transitions, but live Telegram delivery will fail until real credentials are set.
6. Copy `assistant-bot/.env.example` to `assistant-bot/.env.local` and use the same real `TELEGRAM_BOT_TOKEN` when you want to test Telegram polling and queued notifications.
7. Set `PLATFORM_ADMIN_TELEGRAM_ID` in `backend/.env.local` to the Telegram chat ID of the operator account if you want that account to start with platform-admin access.

Create the password file if you do not have it yet:

```bash
docker run --rm -it -v "$PWD/infra/mosquitto:/work" eclipse-mosquitto:2 mosquitto_passwd -c /work/passwd <mqtt_username>
```

## Start The Stack

```bash
docker compose -f docker-compose.local.yml up --build
```

If Docker is running through `colima`, use:

```bash
docker --context colima compose -f docker-compose.local.yml up --build
```

## Publish A Test Payload

```bash
docker compose -f docker-compose.local.yml exec mosquitto \
  mosquitto_pub -h localhost -p 1883 -t meter/5/data -m '{"serial_number":"SN005","device_id":"5","voltage":234.4,"current":0,"power":0,"energy":3300.728,"ip_address":"192.168.1.22","timestamp":"2026-04-26T10:00:00Z","firmware_version":"1.0.0"}'
```

## Expected Results

1. `http://localhost:3000/healthz` returns `status: ok`.
2. MongoDB receives a telemetry document and a device state document.
3. If test messages stop longer than `OFFLINE_TIMEOUT_SECONDS`, Telegram receives one offline alert.
4. Publishing again after that sends one recovered alert.

## Assistant Bot

With a real Telegram bot token configured, the `assistant-bot` service will:

1. poll Telegram for commands and natural-language questions
2. require a default tenant selection during `/start` if the user belongs to multiple tenants
3. consume the Mongo-backed `notification_queue` and send outbound Telegram messages
4. persist pending onboarding and confirmation state in backend `bot_sessions`

Useful starter commands:

```bash
/start
/devices
/device SN005
/fleet_summary
/unclaimed_devices
/online_unclaimed
/active_users
/tenants
/sites
/firmware_policy
/firmware_policy SN005
/remove_device SN005 maintenance
/reboot_device SN005 maintenance
/factory_reset SN005 maintenance
/ota_update SN005 1.0.1
```

Claim flow starter command:

```bash
/add_device
```

The current claim flow asks for:

1. serial number
2. site selection inside the user's default tenant
3. device display name

## Firmware Policy

The backend seeds the current firmware version into the release catalog during startup.

Useful checks:

```bash
curl http://127.0.0.1:3000/admin/firmware/releases
curl http://127.0.0.1:3000/devices/SN005/firmware-policy
curl http://127.0.0.1:3000/admin/firmware/policy
```

Expected current-device result after local bootstrap:

1. `SN005` reports firmware `1.0.0`.
2. `1.0.0` is `supported`.
3. update availability is `false` until a newer compatible release is added.

## Device Actions

The backend exposes a channel-agnostic action API:

```bash
curl -X POST http://127.0.0.1:3000/devices/SN005/actions \
  -H 'Content-Type: application/json' \
  -d '{"action":"reboot","actorUserId":"platform-admin","reason":"maintenance"}'
```

Supported actions:

1. `remove`: unclaims the device immediately and keeps history.
2. `reboot`: publishes an MQTT command to `meter/<deviceId>/control`.
3. `factory_reset`: publishes an MQTT command to wipe app config and Wi-Fi settings, then reboot.

Do not run `factory_reset` on the live device unless you are ready to re-onboard Wi-Fi and app config.

## OTA Dry-Run

You can test the OTA control path safely without flashing new firmware by using an unreachable URL:

```bash
curl -X POST http://127.0.0.1:3000/ota/jobs \
  -H 'Content-Type: application/json' \
  -d '{
    "device_id":"5",
    "serial_number":"SN005",
    "version":"1.0.1-ota-dry-run",
    "url":"http://192.168.1.20:65534/firmware.bin"
  }'
```

Expected OTA dry-run behavior:

1. The backend returns an OTA job with status `published`.
2. The ESP32 emits OTA status events on `meter/<deviceId>/ota/status`.
3. The final job state becomes `failed` with a message such as `OTA URL is not reachable`.

## Policy-Gated OTA

User-facing OTA should go through the release catalog instead of accepting arbitrary URLs:

```bash
curl -X POST http://127.0.0.1:3000/devices/SN005/ota \
  -H 'Content-Type: application/json' \
  -d '{"version":"1.0.1","actorUserId":"platform-admin"}'
```

Expected behavior:

1. The requested version must exist in `firmware_releases`.
2. The release must be compatible with the target device metadata.
3. The release must have a downloadable `url`.
4. The release must not be marked `unsupported`.
