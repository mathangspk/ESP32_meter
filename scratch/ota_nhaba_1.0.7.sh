#!/usr/bin/env bash
set -euo pipefail

# Login to get JWT token
TOKEN=$(curl -sS -X POST http://127.0.0.1:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@2024!Secure"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

# Send OTA job request for nhaba (ESP32)
curl -sS -X POST http://127.0.0.1:3000/ota/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "device_id": "7B34E3EC",
    "serial_number": "7B34E3EC",
    "version": "1.0.7",
    "url": "http://167.71.207.5:8081/esp32-meter-1.0.7.bin"
  }'
echo "OTA job triggered successfully!"
