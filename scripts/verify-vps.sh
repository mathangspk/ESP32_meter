#!/bin/zsh

set -euo pipefail

SSH_ALIAS="${SSH_ALIAS:-vps-prod}"
DEPLOY_DIR="${DEPLOY_DIR:-/home/tma_agi/esp32_loss_power_deploy}"
REMOTE_DOCKER_CONFIG="${REMOTE_DOCKER_CONFIG:-/home/tma_agi/empty-docker-config}"
REMOTE_COMPOSE_FILE="${REMOTE_COMPOSE_FILE:-docker-compose.deploy.yml}"
DEVICE_ID="${DEVICE_ID:-SN005}"

usage() {
  cat <<'EOF'
Usage:
  scripts/verify-vps.sh [--device SN005]

Options:
  --device ID   Device serial or device id to check, default: SN005
  --help        Show this help

Environment overrides:
  SSH_ALIAS             SSH alias, default: vps-prod
  DEPLOY_DIR            Remote deploy dir, default: /home/tma_agi/esp32_loss_power_deploy
  REMOTE_DOCKER_CONFIG  Remote Docker config dir, default: /home/tma_agi/empty-docker-config
  REMOTE_COMPOSE_FILE   Remote active compose file name, default: docker-compose.deploy.yml
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --device)
      DEVICE_ID="$2"
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

echo "== compose ps =="
ssh "$SSH_ALIAS" "cd '$DEPLOY_DIR' && DOCKER_CONFIG='$REMOTE_DOCKER_CONFIG' docker-compose -f '$REMOTE_COMPOSE_FILE' ps"

echo
echo "== healthz =="
ssh "$SSH_ALIAS" "curl -sS http://127.0.0.1:3000/healthz"

echo
echo "== device health: $DEVICE_ID =="
ssh "$SSH_ALIAS" "curl -sS http://127.0.0.1:3000/devices/'$DEVICE_ID'/health"

echo
echo "== recent broker logs =="
ssh "$SSH_ALIAS" "docker logs esp32losspowerdeploy_mosquitto_1 --tail 20"
