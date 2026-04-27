#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  printf 'Usage: %s <firmware-dir-on-vps> [port]\n' "$0" >&2
  exit 1
fi

firmware_dir="$1"
port="${2:-8081}"

ssh vps-prod "docker rm -f esp32-firmware-host >/dev/null 2>&1 || true && docker run -d --name esp32-firmware-host -p ${port}:8080 -v ${firmware_dir}:/data:ro python:3-alpine sh -c 'python3 -m http.server 8080 -d /data'"
