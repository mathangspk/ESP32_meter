# Project Handoff - Swap Primary and Backup MQTT Servers, DB Restoration & Real-time Failover Sync (v1.1.0)

## Summary of Changes
- **Telegram Bot Conflict Resolved**: Identified and resolved the `Conflict 409` Telegram getUpdates conflict caused by the `assistant-bot` service running concurrently on both primary and backup VPS servers.
- **Alert Loop Fixed**: Identified and resolved the root cause of device `7B34E3EC` spamming online/offline notifications. The backup database had duplicate device state records for `7B34E3EC` because the unique index on `deviceId` was missing there. One duplicate record was stuck with an old timestamp, prompting the backup's check-offline job to repeatedly enqueue offline notifications, which were subsequently sent out by the backup bot.
- **Database Re-indexing**: Ran the sync/restore script to drop the duplicate documents and successfully rebuild the `deviceId_1` unique index on the backup database.
- **Backup Bot Disabled**: Appended `_placeholder_backup_disabled` to the `TELEGRAM_BOT_TOKEN` in `.env.prod` on the backup VPS. This disables Telegram polling and notification processors on the passive node, preventing future conflicts.
- **Swapped MQTT Broker Roles**: Swapped primary and backup roles so the free VPS (`113.161.220.166`) is the primary, and DigitalOcean (`167.71.207.5`) is the backup.
- **Firmware C++ Configurations Swapped**: Swapped hardcoded default MQTT broker values in both ESP32 and ESP8266 source directories.
- **PlatformIO Version Bumped**: Bumped the default firmware compilation macro `FIRMWARE_VERSION` to `1.0.9`.
- **SSH Aliases Swapped**: Updated `vps-prod` alias in local SSH configuration to point to the new primary VPS (`100.77.157.70:4422`) and `managetool-vps` to point to the backup VPS.
- **Bidirectional MQTT Bridge**: Configured the Mosquitto broker bridge on the backup VPS to be bidirectional for `meter/+/data`, `meter/+/ota/status`, `meter/+/control`, and `firmwareUpdateOTA/device/+` topics, allowing both servers to receive real-time telemetry and control commands.
- **Redeployed backend**: backend/frontend/database stack successfully redeployed and running on the new primary VPS (`113.161.220.166`) with backend mapped to port `3005` to avoid port conflict on the host.
- **Database Backup & Restoration Complete**: The MongoDB database on the backup DigitalOcean VPS was successfully backed up, transferred, decrypted, and restored on the new primary VPS.
- **Automated Metadata Sync**: Set up passwordless SSH between primary and backup VPS hosts. Deployed `scripts/sync-metadata-to-backup.sh` running as an hourly cron job on the primary VPS to automatically sync system configuration collections (Users, Devices, Claims, Tenants, etc.) to the backup VPS database.
- **Registered releases**: Version `1.0.9` firmware releases successfully registered in the new primary MongoDB database.

## Current System State
- The new primary VPS runs the backend on port `3005`, and Mosquitto accepts local/external MQTT traffic.
- The database is fully restored on the primary VPS, and telemetry is flowing actively.
- The new backup VPS mosquitto bridge successfully connected to the new primary VPS.
- System configurations (Users, Devices, Claims...) are synchronized hourly between the primary and backup databases.
- Firmware compiles successfully with the new default configurations.
- The passive backup Telegram bot has getUpdates polling and notification delivery cleanly disabled via environment variables, eliminating token conflict crashes.

## Verification & Testing
- **Conflict Cessation**: Checked the primary VPS `assistant-bot` logs and confirmed `Conflict 409` errors have stopped.
- **Backup Bot Status**: Checked the backup VPS `assistant-bot` logs and confirmed it outputted `Telegram polling disabled...` and `Notification delivery disabled...` as expected.
- **Duplicate Document Cleared**: Verified via `mongosh` queries on the backup database that the duplicate `device_states` document for `7B34E3EC` was dropped and the unique index was successfully rebuilt.
- **Compilation**: Verified firmware compiles successfully locally for ESP32 and ESP8266 targets.
- **Bridge Connection**: Inspected logs of the new backup VPS mosquitto and confirmed the bridge initialized and connected successfully.
- **DB Verification**: Verified in MongoDB on the new primary VPS that `1.0.9` releases are registered successfully.
- **DB Migration & Count Verification**: Confirmed telemetry collection was successfully restored. Count on primary VPS is `398,643` documents, matching the count from the backup VPS.
- **Real-time Flow Verification**: Confirmed that the latest telemetry record timestamp matches current system time, verifying active data flow.
- **Metadata Sync Verification**: Manually ran the `sync-metadata-to-backup.sh` script and verified that metadata database collections (e.g. Users, Devices) match count (`3` users, `3` devices) on both servers.

## Next Steps
- Monitor Telegram alerts and device statuses normally. The alerts are now fully stable and sent only by the primary VPS.
