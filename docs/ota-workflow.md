# OTA Workflow

## Overview

The repository now supports a staged OTA flow:

1. The backend creates an OTA job.
2. The backend publishes an MQTT command to the device-specific OTA topic.
3. The ESP32 receives the command, validates the URL, and reports OTA status events.
4. The backend stores the OTA job and status history in MongoDB.

Telegram is not wired in yet. The intended next step is for Telegram commands to call the same backend OTA job flow instead of talking to MQTT directly.

## MQTT Topics

- Command topic: `firmwareUpdateOTA/device/<serialNumber>`
- Status topic: `meter/<deviceId>/ota/status`

## OTA Command Payload

```json
{
  "job_id": "7c536440-01e3-4316-8740-4460e1f35339",
  "device_id": "5",
  "serial_number": "SN005",
  "version": "1.0.1",
  "url": "https://example.com/firmware/esp32-meter-1.0.1.bin",
  "sha256": "optional-checksum"
}
```

Notes:

- `sha256` is stored and forwarded but is not enforced by the current firmware yet.
- The firmware still accepts the older `OTAurl` field for compatibility with previous tests.

## OTA Status Payload

```json
{
  "job_id": "7c536440-01e3-4316-8740-4460e1f35339",
  "device_id": "5",
  "serial_number": "SN005",
  "status": "failed",
  "message": "OTA URL is not reachable",
  "current_version": "1.0.0",
  "target_version": "1.0.1",
  "timestamp": "2026-04-26T05:41:43Z"
}
```

Supported status values:

- `received`
- `downloading`
- `success`
- `failed`

## Backend HTTP API

Create an OTA job:

```bash
curl -X POST http://127.0.0.1:3000/ota/jobs \
  -H 'Content-Type: application/json' \
  -d '{
    "device_id":"5",
    "serial_number":"SN005",
    "version":"1.0.1",
    "url":"https://example.com/firmware/esp32-meter-1.0.1.bin"
  }'
```

List recent OTA jobs:

```bash
curl http://127.0.0.1:3000/ota/jobs
```

Get one OTA job:

```bash
curl http://127.0.0.1:3000/ota/jobs/<job-id>
```

## MongoDB Collections

- `ota_jobs`: the latest job state per job ID
- `ota_status_events`: every status update sent by the ESP32

The current device state document is also updated with:

- `lastOtaJobId`
- `lastOtaStatus`
- `lastOtaTargetVersion`
- `lastOtaMessage`
- `lastOtaUpdatedAt`

## Verified Dry-Run

The OTA control plane was verified with a safe failing URL:

- backend created an OTA job
- backend published the MQTT command
- ESP32 emitted `received`, `downloading`, and `failed`
- backend stored the OTA job and status history in MongoDB

This verified the command path without flashing a new firmware image.

## Next Steps

1. Add a real firmware artifact host such as GitHub Releases or a VPS static file path.
2. Add checksum enforcement in firmware before applying OTA.
3. Add Telegram admin commands that call the OTA HTTP API.
4. Add an OTA success test with a real `.bin` artifact.
