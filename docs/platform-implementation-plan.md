# Platform Implementation Plan

## Goal

Turn the current firmware plus backend repository into a tenant-aware device platform with:

- `tenant / site / users / devices` domain modeling
- a shared `assistant-bot` for customer users and platform admins
- Telegram outbound delivery through a Mongo-backed notification queue
- firmware release policy and OTA management across mixed firmware versions

## Compact Brief

- Firmware handles measurement, Wi-Fi bootstrap, telemetry, OTA, reboot, and factory reset.
- Backend is the source of truth for telemetry, fleet state, tenants, sites, users, devices, onboarding, OTA jobs, firmware policy, and notification queueing.
- `assistant-bot` is a separate service that owns Telegram polling, RBAC, onboarding conversations, confirmation flow, and Groq-backed natural language answers.
- Telegram is only one channel adapter. Backend business logic must stay channel-agnostic.
- `unsupported` firmware still ingests telemetry but must be flagged strongly in policy and operator views.

## Implementation Order

### Milestone 1: Domain Foundation And Fleet Visibility

1. Add backend collections and types for:
   - `tenants`
   - `sites`
   - `users`
   - `tenant_memberships`
   - `channel_identities`
   - `devices`
   - `device_assignments`
   - `audit_events`
   - `notification_queue`
2. Extend telemetry ingest so a first-seen device becomes `networked_unclaimed` in the `devices` collection.
3. Extend telemetry schema to carry hardware identity metadata:
   - `mac_address`
   - `chip_family`
   - `chip_model`
   - `board_type`
4. Add first fleet-facing APIs:
   - `GET /devices`
   - `GET /devices/:deviceId/health`
   - `GET /admin/fleet/summary`
   - `GET /admin/devices/unclaimed`
   - `GET /admin/devices/online-unclaimed`
5. Replace direct backend Telegram alert sends with notification queue entries.

### Milestone 2: Firmware Release Policy

1. Add `firmware_releases` collection.
2. Implement update policy evaluation:
   - release severity: `optional | recommended | required`
   - support status: `supported | deprecated | unsupported`
3. Add policy APIs for devices and firmware release management.

### Milestone 3: Assistant Bot Baseline

1. Create `assistant-bot/` service.
2. Implement Telegram long polling.
3. Implement channel identity resolution and RBAC.
4. Force users with multiple tenant memberships to set a `default tenant` during `/start`.
5. Consume the Mongo-backed notification queue and send outbound Telegram messages.

### Milestone 4: Onboarding Workflow

1. Add `onboarding_sessions` collection.
2. Implement `/add_device` claim flow using `serial_number`.
3. Use the user's `default tenant` and ask for site selection.
4. Collect display name and alert preferences.

### Milestone 5: Sensitive Action Workflows

1. Add confirm-once-more flows for:
   - claim
   - OTA
   - remove
   - factory reset
   - reboot
2. Add command jobs and audit events for these actions.

### Milestone 6: Groq Integration

1. Add deterministic intent routing first.
2. Use Groq only for natural language summaries and simple Q&A based on backend-provided context.
3. Keep Groq out of direct control paths.

## Product Rules

- A user may belong to multiple tenants.
- A user must choose a `default tenant` during `/start` if they belong to multiple tenants.
- A device belongs to exactly one site at a time.
- Removing a device makes it `unclaimed` immediately and keeps historical data.
- Factory reset wipes app config and Wi-Fi credentials, then returns the device to AP mode.
- Platform admins can see all tenants, sites, users, and devices.
