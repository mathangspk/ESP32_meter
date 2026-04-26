#!/bin/zsh

set -euo pipefail

PID_FILE="/tmp/esp32-loss-power-mqtt-relay.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "MQTT relay is not running"
  exit 0
fi

PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "Stopped MQTT relay PID $PID"
else
  echo "MQTT relay PID $PID was not running"
fi

rm -f "$PID_FILE"
