#!/usr/bin/env bash
set -euo pipefail

# Login to get JWT token
TOKEN=$(curl -sS -X POST http://127.0.0.1:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@2024!Secure"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

echo "--- OTA Job Status ---"
curl -sS http://127.0.0.1:3000/ota/jobs/42325433-8472-473b-9bc4-63068fb1699a \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n--- Device Info ---"
curl -sS http://127.0.0.1:3000/devices/7B34E3EC \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n"
