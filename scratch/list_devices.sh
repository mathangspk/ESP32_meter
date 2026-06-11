#!/usr/bin/env bash
set -euo pipefail

# Login to get JWT token
TOKEN=$(curl -sS -X POST http://127.0.0.1:3005/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@2024!Secure"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

echo "--- Devices List ---"
curl -sS http://127.0.0.1:3005/devices/ \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo -e "\n"
