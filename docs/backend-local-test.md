# Backend Local Test

## Prerequisites

- Docker Desktop or another Docker runtime installed locally
- Telegram bot token and chat ID

## Setup

1. Copy `backend/.env.example` to `backend/.env.local`.
2. Fill in `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
3. Keep `MQTT_URL=mqtt://mosquitto:1883` and `MONGODB_URI=mongodb://mongodb:27017` for the local stack.

## Start The Stack

```bash
docker compose -f docker-compose.local.yml up --build
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
