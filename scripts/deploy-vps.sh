#!/bin/zsh

set -euo pipefail

SSH_ALIAS="${SSH_ALIAS:-vps-prod}"
DEPLOY_DIR="${DEPLOY_DIR:-/home/tma_agi/esp32_loss_power_deploy}"
REMOTE_DOCKER_CONFIG="${REMOTE_DOCKER_CONFIG:-/home/tma_agi/empty-docker-config}"
LOCAL_COMPOSE_FILE="${LOCAL_COMPOSE_FILE:-docker-compose.vps.yml}"
REMOTE_COMPOSE_FILE="${REMOTE_COMPOSE_FILE:-docker-compose.deploy.yml}"

ENV_FILE=""
PASSWD_FILE=""

usage() {
  cat <<'EOF'
Usage:
  scripts/deploy-vps.sh --env-file /path/to/.env.prod --passwd-file /path/to/passwd.user

Options:
  --env-file PATH       Local production env file to copy to VPS as .env.prod
  --passwd-file PATH    Local Mosquitto password file to copy to VPS as infra/mosquitto/passwd.user
  --help                Show this help

Environment overrides:
  SSH_ALIAS             SSH alias, default: vps-prod
  DEPLOY_DIR            Remote deploy dir, default: /home/tma_agi/esp32_loss_power_deploy
  REMOTE_DOCKER_CONFIG  Remote Docker config dir, default: /home/tma_agi/empty-docker-config
  LOCAL_COMPOSE_FILE    Local tracked VPS compose file, default: docker-compose.vps.yml
  REMOTE_COMPOSE_FILE   Remote active compose file name, default: docker-compose.deploy.yml
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --passwd-file)
      PASSWD_FILE="$2"
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

if [[ -z "$ENV_FILE" || -z "$PASSWD_FILE" ]]; then
  echo "Both --env-file and --passwd-file are required" >&2
  usage >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$PASSWD_FILE" ]]; then
  echo "Password file not found: $PASSWD_FILE" >&2
  exit 1
fi

if [[ ! -f "$LOCAL_COMPOSE_FILE" ]]; then
  echo "Compose file not found: $LOCAL_COMPOSE_FILE" >&2
  exit 1
fi

echo "Preparing remote deploy directories..."
ssh "$SSH_ALIAS" "mkdir -p '$DEPLOY_DIR/infra/mosquitto' '$REMOTE_DOCKER_CONFIG'"

echo "Syncing app and infra files..."
rsync -az --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude "dist" \
  --exclude ".env.local" \
  --exclude ".env.prod" \
  --exclude "passwd" \
  --exclude "passwd.user" \
  backend assistant-bot infra "$LOCAL_COMPOSE_FILE" \
  "$SSH_ALIAS:$DEPLOY_DIR/"

echo "Copying production env and Mosquitto password file..."
scp "$ENV_FILE" "$SSH_ALIAS:$DEPLOY_DIR/.env.prod"
scp "$PASSWD_FILE" "$SSH_ALIAS:$DEPLOY_DIR/infra/mosquitto/passwd.user"

echo "Activating tracked VPS compose file..."
ssh "$SSH_ALIAS" "cp '$DEPLOY_DIR/$LOCAL_COMPOSE_FILE' '$DEPLOY_DIR/$REMOTE_COMPOSE_FILE'"

echo "Deploying stack on VPS..."
ssh "$SSH_ALIAS" "cd '$DEPLOY_DIR' && DOCKER_CONFIG='$REMOTE_DOCKER_CONFIG' docker-compose -f '$REMOTE_COMPOSE_FILE' up -d --build"

echo "Deployment finished. Next step: scripts/verify-vps.sh"
