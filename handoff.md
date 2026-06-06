# Project Handoff - VPS Setup, Hardening & Restoration

## Summary of Changes
- **SSH Key-Only Hardening**: Configured key-only SSH authentication for user `technician` on the new VPS (`167.71.207.5`). Password-based logins over SSH have been completely disabled.
- **Dynamic Path & Container Resolution**: Modified `scripts/restore-meter.sh`, `scripts/backup-meter.sh`, and `scripts/setup-backup-cron.sh` to make user home directories dynamic (using `$HOME` instead of hardcoded `/home/tma_agi`). Modified container resolution to dynamically search for the running MongoDB container name (ends with `-mongodb-1` or `_mongodb_1`) rather than a hardcoded name.
- **Robust Pattern Searching**: Added the double hyphen `--` option separator to `grep` pattern checks inside the scripts to prevent patterns starting with `-` (like `-mongodb-1$`) from being interpreted as CLI options.
- **Disaster Recovery Restore**: Executed `restore-meter.sh --latest` using the retrieved production `JWT_SECRET` key. Successfully downloaded the latest backup from Google Drive, decrypted it, restored all database collections, and recreated configurations.
- **Daily Automated Backup Setup**: Re-enabled automated daily backups on the new VPS using `setup-backup-cron.sh`.

## Current System State
- All 5 docker containers are up and running on the new VPS (`167.71.207.5`).
- The backend health status is `ok` with successful connections to both MQTT and MongoDB.
- SSH access is locked down to key-only authentication via `do_ssh_key`. Password-based logins are disabled.
- Automated daily backup cron job is active.

## Verification & Testing
- **SSH Verification**: Tested key-only SSH login which connects successfully. Confirmed that password-based authentication is rejected with `Permission denied (publickey)`.
- **Backend Health Check**: Executed `curl -sS http://127.0.0.1:3005/healthz` inside the VPS. Output: `{"status":"ok","uptimeSeconds":339,"mqttConnected":true,"mongodbConnected":true}`.
- **Database Restoration**: Verified that MongoDB database was restored successfully from the decrypted `.enc` Google Drive archive.
- **Backup Verification**: Triggered a test backup by running `backup-meter.sh` on the VPS. Verified that it dumps the restored DB, AES-256 encrypts the archive, uploads it to Google Drive remote (`tma-agi-backup:esp32_meter`), and successfully applies the 7-day retention cleanup.

## Next Steps
- Advise the user to access the web dashboard at `http://167.71.207.5:8080` to verify restored devices and historical telemetry.
- Monitor telemetry of active meters on the new VPS.
