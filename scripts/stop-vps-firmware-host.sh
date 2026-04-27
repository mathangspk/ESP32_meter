#!/usr/bin/env bash
set -euo pipefail

ssh vps-prod "docker rm -f esp32-firmware-host >/dev/null 2>&1 || true"
