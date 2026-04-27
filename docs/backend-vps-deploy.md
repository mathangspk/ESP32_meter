# Backend VPS Deploy

Use `docs/deploy-memory.md` first for invariants, allowed local↔VPS deltas, and standard promotion order.

For current live VPS runtime details and host-specific workarounds, also read `docs/vps-runtime.md`.

## Overview

Production runs these services together:

- `mosquitto`
- `mongodb`
- `backend`
- `assistant-bot`

MongoDB stays internal to the Docker network and is not published on the VPS host.

Backend binds only to `127.0.0.1:3000` on the VPS host so admin access can stay on Tailscale or an SSH session.

## Prepare The VPS

1. Install Docker Engine and the Docker Compose plugin.
2. Clone this repository on the VPS.
3. Copy `.env.prod.example` to `.env.prod` beside `docker-compose.prod.yml`.
4. Create `infra/mosquitto/passwd` with a real Mosquitto username and password.

Example `.env.prod` values:

```bash
cp .env.prod.example .env.prod
```

If you want to pin non-default image tags, export `BACKEND_IMAGE` and `ASSISTANT_BOT_IMAGE` before running `docker compose` or create a root `.env` file with those values.

Create the Mosquitto password file before the first deploy:

```bash
docker run --rm -it -v "$PWD/infra/mosquitto:/work" eclipse-mosquitto:2 mosquitto_passwd -c /work/passwd <mqtt_username>
```

Then put the same MQTT credentials into `.env.prod` for the backend:

```text
MQTT_USERNAME=<mqtt_username>
MQTT_PASSWORD=<mqtt_password>
```

The production compose file expects `infra/mosquitto/passwd` to exist and mounts it read-only into the Mosquitto container.

## Pull And Start

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Upgrade

1. Push code to `main`.
2. Wait for the GitHub Actions image publish workflow to complete.
3. On the VPS, pull the new image and restart:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Roll Back

1. Change `BACKEND_IMAGE` in `.env.prod` to an older tag.
2. Restart the stack:

```bash
docker compose -f docker-compose.prod.yml up -d
```
