# Project Handoff - Swap Primary and Backup MQTT Servers (v1.1.0)

## Summary of Changes
- **Swapped MQTT Broker Roles**: Swapped primary and backup roles so the free VPS (`113.161.220.166`) is the primary, and DigitalOcean (`167.71.207.5`) is the backup.
- **Firmware C++ Configurations Swapped**: Swapped hardcoded default MQTT broker values in both ESP32 and ESP8266 source directories.
- **PlatformIO Version Bumped**: Bumped the default firmware compilation macro `FIRMWARE_VERSION` to `1.0.9`.
- **SSH Aliases Swapped**: Updated `vps-prod` alias in local SSH configuration to point to the new primary VPS (`100.77.157.70:4422`) and `managetool-vps` to point to the backup VPS.
- **MQTT Bridge Updated**: Removed the MQTT bridge configuration on the new primary VPS and configured the bridge on the new backup VPS pointing to the new primary VPS.
- **Redeployed backend**: backend/frontend/database stack successfully redeployed and running on the new primary VPS (`113.161.220.166`).
- **Registered releases**: Version `1.0.9` firmware releases successfully registered in the new primary MongoDB database.

## Current System State
- The new primary VPS runs the backend on port `3005`, and Mosquitto accepts local/external MQTT traffic.
- The new backup VPS mosquitto bridge successfully connected to the new primary VPS.
- Firmware compiles successfully with the new default configurations.

## Verification & Testing
- **Compilation**: Verified firmware compiles successfully locally for ESP32 and ESP8266 targets.
- **Bridge Connection**: Inspected logs of the new backup VPS mosquitto and confirmed the bridge initialized successfully.
- **DB Verification**: Verified in MongoDB on the new primary VPS that `1.0.9` releases are registered successfully.

## Next Steps
- Host the compiled version `1.0.9` binaries on the new primary VPS port `8081` and trigger OTA update for fleet devices.
