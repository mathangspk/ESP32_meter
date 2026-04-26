#!/bin/zsh

set -euo pipefail

RELAY_PORT=1883
TARGET_HOST=127.0.0.1
TARGET_PORT=1884
PID_FILE="/tmp/esp32-loss-power-mqtt-relay.pid"
LOG_FILE="/tmp/esp32-loss-power-mqtt-relay.log"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "MQTT relay already running with PID $(cat "$PID_FILE")"
  exit 0
fi

nohup socat TCP-LISTEN:"$RELAY_PORT",bind=0.0.0.0,reuseaddr,fork TCP:"$TARGET_HOST":"$TARGET_PORT" >>"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"
echo "Started MQTT relay on ${RELAY_PORT} -> ${TARGET_HOST}:${TARGET_PORT} (PID $(cat "$PID_FILE"))"
