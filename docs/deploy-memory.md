# Deploy Memory

## Purpose

Keep local Docker work and VPS Docker deploy close enough that future deploys are mechanical instead of rediscovery.

When someone says `deploy to VPS`, this file is source of truth for:

- what must stay same between local and VPS
- what is allowed to differ
- exact order to promote local-tested changes to VPS
- what facts to record after each deploy

## Core Invariants

These should stay same across local and VPS unless there is a strong reason to change them.

1. Same service shape:
   - `mosquitto`
   - `mongodb`
   - `backend`
   - `assistant-bot`
2. MQTT requires `username/password`.
3. MongoDB stays internal to Docker and is not published publicly.
4. `backend` stays reachable on `127.0.0.1:3000` from host, not public `0.0.0.0:3000`.
5. `assistant-bot` talks to `backend` through Docker network.
6. Mosquitto config comes from `infra/mosquitto/mosquitto.conf`.
7. Mosquitto password file path stays `infra/mosquitto/passwd`.

## Expected Local vs VPS Deltas

These differences are intentional. Do not treat them as drift.

### Local-only

- `docker-compose.local.yml`
- builds app images from source
- Mosquitto host port is `1884:1883`
- local env files:
  - `backend/.env.local`
  - `assistant-bot/.env.local`
- may use `docker --context colima`
- may use local relay or LAN-specific setup for ESP32 testing

### VPS-only

- `docker-compose.prod.yml`
- pulls app images from `ghcr.io`
- Mosquitto host port is `1883:1883`
- root env file is `.env.prod`
- MQTT target for live ESP32 points to public VPS IP/domain
- backup location target is `/opt/backups/mongodb`

## Promotion Rule

Do not deploy to VPS first.

Always use this order:

1. change code or config
2. run local Docker stack
3. verify behavior locally
4. only then deploy same service shape to VPS

If local and VPS must differ, record delta here before or during deploy work.

## Exact VPS Deploy Flow

When asked to deploy to VPS, use this order unless user says otherwise.

1. Confirm local Docker verification already passed for current change.
2. Confirm `docker-compose.prod.yml` still matches deploy invariants above.
3. Confirm `.env.prod` is present on VPS with real values.
4. Confirm `infra/mosquitto/passwd` is present on VPS.
5. Pull images:

```bash
docker compose -f docker-compose.prod.yml pull
```

6. Start or refresh stack:

```bash
docker compose -f docker-compose.prod.yml up -d
```

7. Verify runtime:

```bash
curl http://127.0.0.1:3000/healthz
docker compose -f docker-compose.prod.yml ps
```

8. Only after stack is healthy, cut ESP32 MQTT target to VPS if needed.
9. Delegate the read-only verification pass to `vps-verify` when available, or to built-in `general` when the runtime only exposes built-in subagent types.

## Local Verification Minimum

Before VPS deploy, local stack should at least prove:

1. `docker compose -f docker-compose.local.yml up --build -d` succeeds.
2. `curl http://127.0.0.1:3000/healthz` returns healthy.
3. MQTT ingest path still works.
4. if change affects bot, `assistant-bot` starts cleanly.
5. if change affects deploy shape, both compose files still render.

## Facts To Record After Each Deploy

After every meaningful VPS deploy, update `docs/handoff.md` with:

1. deployed commit or image tag
2. what changed
3. what stayed intentionally different between local and VPS
4. exact verify commands used
5. actual verify result
6. remaining risk or next step

If a new local↔VPS delta appears, append it here.

## Verification Delegation

When the stack is already deployed and the task is verification-only, prefer the `vps-verify` subagent.

If the runtime cannot call custom subagent types directly, use built-in `general` with the same verification contract.

Recommended checks for `vps-verify`:

1. `docker compose ... ps` or equivalent VPS container status
2. `curl http://127.0.0.1:3000/healthz`
3. broker logs or MQTT subscription evidence when live device traffic is expected
4. `GET /devices` or `GET /devices/<serial>/health`
5. concise blocker summary plus next safe action

## Current Known Deltas

1. Local Mosquitto host port is `1884`; VPS Mosquitto host port is `1883`.
2. Local app images are built from source; VPS app images are pulled from `ghcr.io`.
3. Local env is split across service directories; VPS env is consolidated in root `.env.prod`.
4. Local may rely on `colima`; VPS runs Docker directly on host.
5. Current VPS Docker client cannot pull normally with its default credential path; use a clean `DOCKER_CONFIG` directory for remote pulls and compose runs.
6. Current VPS Compose parser is older than expected and rejected parts of the repo prod compose file during this deploy; a resolved deploy file was used on the VPS for this session.
7. Current VPS deploy for this session ran from `/home/tma_agi/esp32_loss_power_deploy` using `docker-compose.deploy.yml` and local source builds for `backend` and `assistant-bot`.
8. Current VPS runtime uses a user-owned Mosquitto password file mounted as `infra/mosquitto/passwd.user`.

## Drift Rule

If future fix needs a local-only or VPS-only exception, do not leave it implicit.

Update one of these immediately:

- `docs/deploy-memory.md` for persistent environment deltas
- `docs/handoff.md` for current session state and next step
