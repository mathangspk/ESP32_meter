# Debug Runbook

## PZEM Read Failed

If serial logs show `PZEM read failed`, check these first:

1. PZEM module power is present.
2. ESP32 and PZEM share ground.
3. UART wiring is crossed correctly:
   - `ESP32 TX -> PZEM RX`
   - `ESP32 RX -> PZEM TX`
4. Code pin mapping still matches hardware:
   - `RX_PIN = 16`
   - `TX_PIN = 17`
5. The PZEM TTL interface is the one connected to the ESP32.

## MQTT `rc=-2`

If MQTT shows `failed, rc=-2`, check these first:

1. Broker IP and port are reachable from the current network.
2. The broker is actually listening on the configured port.
3. Wi-Fi is connected before MQTT connect attempts.
4. Username and password match the broker.
5. No firewall or NAT rule is blocking the connection.

## NTP Sync Failed

If logs show `Failed to sync time`, check these first:

1. Wi-Fi has internet access, not just LAN access.
2. DNS resolves correctly from the current network.
3. UDP or NTP traffic is not blocked.
4. The configured NTP servers are reachable.

## Long-Run Check

For a stability check:

1. Leave the device running under a real load.
2. Watch for Wi-Fi reconnect loops.
3. Watch for repeated PZEM read failures.
4. Confirm MQTT publish keeps working over time.
5. Record the outcome in `docs/handoff.md`.
