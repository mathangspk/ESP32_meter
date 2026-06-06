#!/bin/bash
# ==============================================================================
# ESP32/ESP8266 Meter System - Automated Backup Cron Job Installer
# Installs and registers the new backup-meter.sh script inside crontab,
# cleaning up obsolete local backup crontab lines in an idempotent way.
# ==============================================================================
set -euo pipefail

SCRIPT_PATH="$HOME/esp32_loss_power_deploy/scripts/backup-meter.sh"
LOG_PATH="$HOME/mongodb_backups/backup.log"

echo "======================================================================"
echo "Installing Automated Backup Cron Job: $(date)"
echo "Target Script: $SCRIPT_PATH"
echo "Target Log:    $LOG_PATH"
echo "======================================================================"

# 1. Verify script existence
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "ERROR: Unified backup script not found at '$SCRIPT_PATH'!" >&2
    echo "Please ensure the codebase has been deployed or rsynced first." >&2
    exit 1
fi

# 2. Ensure the script is executable
chmod +x "$SCRIPT_PATH"
echo "[1/3] Set executable permissions on script."

# 3. Create backup directory if missing
mkdir -p "$(dirname "$LOG_PATH")"
echo "[2/3] Verified backup log directory."

# 4. Read current crontab and filter out obsolete lines
echo "[3/3] Updating crontab..."
TMP_CRON=$(mktemp)
crontab -l 2>/dev/null | grep -v "backup-mongodb.sh" | grep -v "backup-meter.sh" > "$TMP_CRON" || true

# Append the new cron entry (Runs daily at 03:00 AM UTC/local time depending on server zone)
echo "0 3 * * * $SCRIPT_PATH >> $LOG_PATH 2>&1" >> "$TMP_CRON"

# Load new crontab schedule
crontab "$TMP_CRON"
rm -f "$TMP_CRON"

echo "======================================================================"
echo "Crontab Schedule Configured Successfully!"
echo "Active Crontab Schedule:"
echo "----------------------------------------------------------------------"
crontab -l
echo "======================================================================"
