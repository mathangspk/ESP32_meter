# Session Compact

## Current Phase

The project is currently in **Phase 3** of the long-term platform roadmap.

- **Phase 1 completed**: backend domain foundation and fleet visibility
- **Phase 2 partially completed**: `assistant-bot` service exists, Telegram polling baseline exists, notification queue exists, default-tenant flow exists, basic claim flow exists
- **Phase 3 mostly completed**: firmware release catalog, update policy engine, remove/unclaim flow, reboot/factory reset flow, claim confirmation, bot-driven OTA confirmation, policy-gated OTA release flow, and firmware identity metadata exist; persisted onboarding sessions and full Groq-enabled Q&A in real operation are still pending

## Implemented So Far

### Firmware

- PZEM live readings verified
- MQTT publish path verified with the real ESP32
- OTA command and OTA status path verified with a safe dry-run
- MQTT buffer increased so structured OTA payloads can be received reliably
- Remote control command handling implemented on `meter/<deviceId>/control`
- Firmware supports backend `reboot` and `factory_reset` commands
- Telemetry now includes `mac_address`, `chip_family`, `chip_model`, and `board_type`

### Backend

- Telemetry ingest
- Device state tracking
- Offline/recovered alert logic
- OTA jobs over HTTP + MQTT
- OTA status persistence
- Multi-tenant domain foundation collections prepared:
  - `devices`
  - `users`
  - `tenants`
  - `sites`
  - `tenant_memberships`
  - `channel_identities`
  - `device_assignments`
  - `audit_events`
  - `notification_queue`
- Fleet visibility APIs implemented:
  - `GET /devices`
  - `GET /devices/:deviceId/health`
  - `GET /admin/fleet/summary`
  - `GET /admin/devices/unclaimed`
  - `GET /admin/devices/online-unclaimed`
  - `GET /admin/users/summary`
  - `GET /admin/tenants`
  - `GET /admin/sites`
- Bot support APIs implemented:
  - `POST /internal/telegram/identify`
  - `GET /internal/users/:userId/memberships`
  - `POST /internal/users/:userId/default-tenant`
  - `GET /internal/users/:userId/tenants`
  - `GET /internal/tenants/:tenantId/sites`
  - `GET /internal/tenants/:tenantId/devices`
  - notification queue endpoints
- Device claim API implemented:
  - `POST /devices/claim`
- Firmware release policy implemented:
  - `firmware_releases` collection
  - bootstrapped `1.0.0` release as `supported` / `optional`
  - `GET /admin/firmware/releases`
  - `POST /admin/firmware/releases`
  - `GET /devices/:deviceId/firmware-policy`
  - `GET /admin/firmware/policy`
- Device management actions implemented:
  - `POST /devices/:deviceId/actions`
  - `GET /admin/device-commands`
  - `remove` unclaims immediately and preserves history
  - `reboot` publishes MQTT control command
  - `factory_reset` publishes MQTT control command
- Policy-gated OTA release flow implemented:
  - `POST /devices/:deviceId/ota`
  - target version must exist in compatible release catalog
  - target release must not be `unsupported`
  - target release must have a URL

### Assistant Bot

- Separate `assistant-bot` service created
- Telegram polling baseline implemented
- Default tenant enforcement during `/start`
- Placeholder-safe mode when Telegram token is fake
- Notification queue consumer implemented
- Basic commands implemented:
  - `/start`
  - `/set_default_tenant`
  - `/add_device`
  - `/devices`
  - `/device <id>`
  - `/fleet_summary`
  - `/unclaimed_devices`
  - `/online_unclaimed`
  - `/active_users`
  - `/tenants`
  - `/sites`
  - `/firmware_policy [serial_or_device_id]`
  - `/remove_device <serial_or_device_id> [reason]`
  - `/reboot_device <serial_or_device_id> [reason]`
  - `/factory_reset <serial_or_device_id> [reason]`
  - `/ota_update <serial_or_device_id> <firmware_version>`
- Second-confirmation flows implemented for claim, remove, reboot, and factory reset
- Second-confirmation flow implemented for OTA updates through release catalog
- Basic claim flow implemented:
  - serial number
  - site selection
  - display name

## Verified Runtime State

- Local stack runs with:
  - `mongodb`
  - `mosquitto`
  - `backend`
  - `assistant-bot`
- Backend build and typecheck pass
- Assistant-bot build and typecheck pass
- Firmware policy runtime endpoints pass for `SN005`
- Firmware upload passed with remote control and telemetry metadata changes
- `SN005` remote reboot command was published and the device recovered with new telemetry
- OTA release endpoint validation passes and refuses release versions without artifact URLs
- The live `SN005` device is currently:
  - `claimStatus=claimed`
  - `lifecycleStatus=active`
  - `displayName=Main Meter`
  - assigned to:
    - `tenant-default`
    - `site-default`

## Important Current Constraints

- `assistant-bot` onboarding state is still in memory; it is not yet persisted in backend onboarding sessions
- Onboarding/confirmation state is still in-memory inside `assistant-bot`
- OTA job creation is not yet automatically gated by firmware policy
- Legacy direct OTA endpoint still exists for engineering dry-runs; bot OTA uses the policy-gated release endpoint
- Groq integration exists in code path but has not been verified with real credentials in runtime
- Local Telegram real delivery still depends on replacing placeholder credentials

## Source Of Truth Files

Read these first in a new session:

1. `PROJECT_CONTEXT.md`
2. `docs/handoff.md`
3. `docs/platform-implementation-plan.md`
4. `docs/session-compact.md`

## Best Next Step

Implement the next major milestone in this order:

1. persisted onboarding sessions
2. real Telegram credential verification
3. OTA success path with a hosted artifact
