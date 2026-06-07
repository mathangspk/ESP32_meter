# Project Handoff - Active-Passive MQTT Failover Redundancy

## Summary of Changes
- **Active-Passive MQTT Failover**: Implemented a connection failover strategy where the device targets the Primary MQTT broker. If it fails 3 consecutive times, it cycles targeting to the Backup MQTT broker.
- **Preemptive Primary Reconnection**: When connected to the backup broker, the device checks every 5 minutes (300,000 ms) by disconnecting and attempting to reconnect to the primary broker. If it fails, it cycles back to the backup broker seamlessly.
- **Configurable Backup Settings**: Added "Backup MQTT Server" and "Backup MQTT Port" input fields to the local Web Captive Portal configuration page (`WebConfigHTML.h` & `WebConfig.cpp`), which persists configuration variables to LittleFS.
- **100-Line Limit Compliance**: Split `ConfigManagerIO.cpp` into `ConfigManagerLoad.cpp` and `ConfigManagerSave.cpp` across both ESP32 and ESP8266 platforms. Compiling and refactoring kept all modified files strictly under 100 lines.

## Current System State
- All three devices in the fleet are fully functional and run version `1.0.3` with active-passive MQTT failover redundancy.
- Mosquitto MQTT Bridge is active and configured on the backup server (`113.161.220.166` / Tailscale `100.77.157.70`) pointing to primary (`167.71.207.5`), bridging telemetry topics (`meter/+/data`, `meter/+/ota/status`) and control/OTA topics.
- Every single code and stylesheet file in the repository satisfies the 100-line limit.
- All code compiles successfully with PlatformIO for both `esp32doit-devkit-v1` and `nodemcuv2` targets.

## Verification & Testing
- **Firmware Compilation**: Succeeded for both `esp32doit-devkit-v1` and `nodemcuv2` targets.
- **OTA Upgrades**: Successfully deployed and verified version `1.0.3` OTA updates for:
  - ESP8266 Device `004A936C` (NLMT_Long)
  - ESP32 Device `7B34E3EC` (nhaba)
  - ESP32 Device `D534E3EC` (NhaLong)
- **Active-Passive Failover Simulation**: Stopped the primary MQTT broker container (`esp32_loss_power_deploy-mosquitto-1`). Verified that devices successfully established connection with the backup broker and sent telemetry.
- **MQTT Bridge Real-Time Forwarding**: Verified that telemetry published to the backup broker was bridged to the primary broker in real-time, allowing the primary backend to update the MongoDB database.
- **Automatic Recovery**: Restarted the primary Mosquitto broker. Verified that the bridge and devices cleanly restored connection.

## Next Steps
- Monitor long-term system stability of version `1.0.3` under failover conditions.
- Implement any frontend dashboard enhancements desired by the user.
