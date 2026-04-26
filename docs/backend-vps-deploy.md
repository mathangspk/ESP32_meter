# Backend VPS Deploy

## Overview

Production runs these services together:

- `mosquitto`
- `mongodb`
- `backend`
- `assistant-bot`

MongoDB stays internal to the Docker network and is not published on the VPS host.

## Prepare The VPS

1. Install Docker Engine and the Docker Compose plugin.
2. Clone this repository on the VPS.
3. Create `.env.prod` beside `docker-compose.prod.yml`.

Example `.env.prod` values:

```text
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
MQTT_URL=mqtt://mosquitto:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TOPIC_PATTERN=meter/+/data
MONGODB_URI=mongodb://mongodb:27017
MONGODB_DB_NAME=esp32_power_monitor
TELEGRAM_BOT_TOKEN=replace_me
TELEGRAM_CHAT_ID=replace_me
OFFLINE_TIMEOUT_SECONDS=45
CHECK_INTERVAL_SECONDS=10
PLATFORM_ADMIN_USER_ID=platform-admin
PLATFORM_ADMIN_TELEGRAM_ID=replace_me
PLATFORM_ADMIN_DISPLAY_NAME=Platform Admin
BOOTSTRAP_TENANT_ID=tenant-default
BOOTSTRAP_TENANT_NAME=Default Tenant
BOOTSTRAP_SITE_ID=site-default
BOOTSTRAP_SITE_NAME=Default Site
BOOTSTRAP_FIRMWARE_VERSION=1.0.0
BOOTSTRAP_FIRMWARE_BOARD_TYPE=
BACKEND_BASE_URL=http://backend:3000
TELEGRAM_POLL_INTERVAL_MS=3000
NOTIFICATION_POLL_INTERVAL_MS=5000
GROQ_API_KEY=replace_me
GROQ_MODEL=llama-3.1-8b-instant
GROQ_BASE_URL=https://api.groq.com/openai/v1
```

If you want to pin non-default image tags, export `BACKEND_IMAGE` and `ASSISTANT_BOT_IMAGE` before running `docker compose` or create a root `.env` file with those values.

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
