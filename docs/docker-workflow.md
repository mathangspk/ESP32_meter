# Docker Workflow

## Goal

Use one container-first flow:

1. run full stack locally with Docker
2. verify app behavior locally
3. deploy same service shape to the VPS

This keeps local and VPS closer together and reduces last-minute deploy drift.

Use `docs/deploy-memory.md` as source of truth for intentional local↔VPS differences and exact VPS promotion steps.

## Service Shape

Both local and VPS run the same four services:

- `mosquitto`
- `mongodb`
- `backend`
- `assistant-bot`

Shared rules:

- MQTT requires `username/password`
- MongoDB stays internal to Docker
- `backend` listens on container port `3000`
- `assistant-bot` talks to `backend` over Docker network

Environment-specific differences:

- local builds app images from source
- VPS pulls app images from `ghcr.io`
- local exposes Mosquitto on `1884`
- VPS exposes Mosquitto on `1883`
- local and VPS both bind backend to `127.0.0.1:3000`

## One-Time Setup

Create Mosquitto password file:

```bash
docker run --rm -it -v "$PWD/infra/mosquitto:/work" eclipse-mosquitto:2 mosquitto_passwd -c /work/passwd <mqtt_username>
```

Use same MQTT credentials in:

- `backend/.env.local`
- `.env.prod`
- ESP32 device config for target environment

## Local First

1. Copy `backend/.env.example` to `backend/.env.local`.
2. Copy `assistant-bot/.env.example` to `assistant-bot/.env.local`.
3. Fill `MQTT_USERNAME` and `MQTT_PASSWORD` in `backend/.env.local`.
4. Start local stack:

```bash
docker compose -f docker-compose.local.yml up --build -d
```

If using `colima`:

```bash
docker --context colima compose -f docker-compose.local.yml up --build -d
```

Verify local stack:

```bash
curl http://127.0.0.1:3000/healthz
docker compose -f docker-compose.local.yml ps
```

## VPS Deploy

1. Copy `.env.prod.example` to `.env.prod`.
2. Fill real production secrets and MQTT credentials.
3. Pull and start:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Verify VPS stack:

```bash
curl http://127.0.0.1:3000/healthz
docker compose -f docker-compose.prod.yml ps
```

## Recommended Release Order

1. change code
2. run local Docker stack
3. verify health, MQTT ingest, bot behavior
4. publish or confirm backend and bot images
5. deploy to VPS with `docker-compose.prod.yml`
6. cut ESP32 to VPS MQTT only after VPS health is good
