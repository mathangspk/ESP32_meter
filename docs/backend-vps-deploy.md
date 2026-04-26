# Backend VPS Deploy

## Overview

Production runs these services together:

- `mosquitto`
- `mongodb`
- `backend`

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
```

If you want to pin a non-default image tag, export `BACKEND_IMAGE` before running `docker compose` or create a root `.env` file with that value.

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
