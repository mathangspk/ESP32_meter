#!/bin/bash
# ==============================================================================
# ESP32/ESP8266 Meter System - Unified Full Backup Script
# Backs up MongoDB database + deploy configurations, encrypts with AES-256,
# and synchronizes to Google Drive via rclone with a 7-day retention policy.
# ==============================================================================
set -euo pipefail

# Configurations
BACKUP_DIR="$HOME/mongodb_backups"
DEPLOY_DIR="$HOME/esp32_loss_power_deploy"
DB_NAME="esp32_power_monitor"
CONTAINER="esp32losspowerdeploy_mongodb_1"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="meter_backup_${TIMESTAMP}"
RCLONE_DIR="tma-agi-backup:esp32_meter"
KEEP_DAYS=7

# Resolve rclone command path
RCLONE_CMD="rclone"
if [ -f "$HOME/rclone" ]; then
    RCLONE_CMD="$HOME/rclone"
fi

# Load backup passphrase from env file if available
ENCRYPT_KEY=""
if [ -f "$DEPLOY_DIR/.env.prod" ]; then
    ENCRYPT_KEY=$(grep -E "^BACKUP_PASSPHRASE=" "$DEPLOY_DIR/.env.prod" | cut -d'=' -f2- || true)
    if [ -z "$ENCRYPT_KEY" ]; then
        # Fallback to JWT_SECRET if BACKUP_PASSPHRASE is not set
        ENCRYPT_KEY=$(grep -E "^JWT_SECRET=" "$DEPLOY_DIR/.env.prod" | cut -d'=' -f2- || true)
    fi
fi

echo "======================================================================"
echo "Starting Full Backup: $(date)"
echo "Backup Identity:      $BACKUP_NAME"
echo "======================================================================"

# 1. Create temporary directory structure
TEMP_DIR="/tmp/${BACKUP_NAME}"
mkdir -p "$TEMP_DIR/db"
mkdir -p "$TEMP_DIR/config"
mkdir -p "$BACKUP_DIR"

# 2. Dump MongoDB database
echo "[1/7] Dumping MongoDB database..."
# Dynamically resolve container name if not running under the default name
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    if docker ps --format '{{.Names}}' | grep -q -- "-mongodb-1$"; then
        CONTAINER=$(docker ps --format '{{.Names}}' | grep -- "-mongodb-1$" | head -n 1)
    elif docker ps --format '{{.Names}}' | grep -q "_mongodb_1$"; then
        CONTAINER=$(docker ps --format '{{.Names}}' | grep "_mongodb_1$" | head -n 1)
    fi
fi

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    docker exec "$CONTAINER" mongodump --db "$DB_NAME" --out "/tmp/${BACKUP_NAME}_db" --quiet
    docker cp "${CONTAINER}:/tmp/${BACKUP_NAME}_db/${DB_NAME}" "$TEMP_DIR/db/"
    docker exec "$CONTAINER" rm -rf "/tmp/${BACKUP_NAME}_db"
    echo "      MongoDB dump completed successfully."
else
    echo "      ERROR: MongoDB container '$CONTAINER' is not running!" >&2
    rm -rf "$TEMP_DIR"
    exit 1
fi

# 3. Gather deploy configurations and secrets
echo "[2/7] Copying deployment configurations & secrets..."
if [ -d "$DEPLOY_DIR" ]; then
    [ -f "$DEPLOY_DIR/.env.prod" ] && cp "$DEPLOY_DIR/.env.prod" "$TEMP_DIR/config/"
    [ -f "$DEPLOY_DIR/docker-compose.deploy.yml" ] && cp "$DEPLOY_DIR/docker-compose.deploy.yml" "$TEMP_DIR/config/"
    [ -f "$DEPLOY_DIR/docker-compose.vps.yml" ] && cp "$DEPLOY_DIR/docker-compose.vps.yml" "$TEMP_DIR/config/"
    
    if [ -d "$DEPLOY_DIR/infra" ]; then
        mkdir -p "$TEMP_DIR/config/infra"
        # Copy readable config files, ignoring unreadable root-owned passwd keys
        cp -r "$DEPLOY_DIR/infra/"* "$TEMP_DIR/config/infra/" 2>/dev/null || true
    fi
    echo "      Configurations copied successfully (unreadable system keys skipped)."
else
    echo "      WARNING: Deploy directory '$DEPLOY_DIR' not found. Skipping config backup."
fi

# 4. Compress to tar.gz archive
echo "[3/7] Archiving backup package..."
cd /tmp
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$TEMP_DIR"
echo "      Archive created: ${BACKUP_NAME}.tar.gz"

# 5. Encrypt archive locally using AES-256-CBC
FINAL_FILE="${BACKUP_NAME}.tar.gz"
if [ -n "$ENCRYPT_KEY" ]; then
    echo "[4/7] Encrypting backup archive using AES-256..."
    openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 -k "$ENCRYPT_KEY" -in "${BACKUP_NAME}.tar.gz" -out "${BACKUP_NAME}.tar.gz.enc"
    rm "${BACKUP_NAME}.tar.gz"
    FINAL_FILE="${BACKUP_NAME}.tar.gz.enc"
    echo "      Encryption complete. Protected file: $FINAL_FILE"
else
    echo "[4/7] WARNING: No backup key or JWT_SECRET found. Encryption SKIPPED!"
fi

# Move backup file to the backup directory
mv "/tmp/$FINAL_FILE" "$BACKUP_DIR/"
LOCAL_BACKUP_PATH="${BACKUP_DIR}/${FINAL_FILE}"
echo "[5/7] Local backup preserved: $LOCAL_BACKUP_PATH"

# 6. Upload backup archive to Google Drive
echo "[6/7] Synchronizing backup to Google Drive..."
if $RCLONE_CMD listremotes | grep -q "^$(echo "$RCLONE_DIR" | cut -d':' -f1):"; then
    if $RCLONE_CMD copy "$LOCAL_BACKUP_PATH" "$RCLONE_DIR"; then
        echo "      Synchronized successfully to '$RCLONE_DIR'."
    else
        echo "      ERROR: Failed to upload backup to Google Drive!" >&2
    fi
else
    echo "      WARNING: rclone remote '$(echo "$RCLONE_DIR" | cut -d':' -f1)' not configured. GDrive sync skipped."
fi

# 7. Retention cleanup policies
echo "[7/7] Executing retention and cleanup policies..."

# A. Local cleanup
echo "      - Purging local backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name 'meter_backup_*' -mtime +${KEEP_DAYS} -delete

# B. Google Drive cleanup
echo "      - Purging Google Drive backups older than $KEEP_DAYS days..."
if $RCLONE_CMD listremotes | grep -q "^$(echo "$RCLONE_DIR" | cut -d':' -f1):"; then
    $RCLONE_CMD lsf "$RCLONE_DIR/" | grep "^meter_backup_" | while read -r line; do
        # Extract date from backup name (e.g. meter_backup_20260523_120000.tar.gz.enc)
        file_date=$(echo "$line" | grep -oE '[0-9]{8}')
        if [ -n "$file_date" ]; then
            # Parse date YYYYMMDD to epoch seconds
            file_epoch=$(date -d "$file_date" +%s 2>/dev/null || date -jf "%Y%m%d" "$file_date" "+%s" 2>/dev/null || echo "")
            if [ -n "$file_epoch" ]; then
                current_epoch=$(date -d "-$KEEP_DAYS days" +%s 2>/dev/null || date -v"-${KEEP_DAYS}d" "+%s" 2>/dev/null || echo "")
                if [ -n "$current_epoch" ] && [ "$file_epoch" -lt "$current_epoch" ]; then
                    if $RCLONE_CMD delete "$RCLONE_DIR/$line"; then
                        echo "        GDrive: Purged old backup -> $line"
                    else
                        echo "        GDrive WARNING: Failed to delete old backup -> $line" >&2
                    fi
                fi
            fi
        fi
    done
fi

echo "======================================================================"
echo "Backup Completed Successfully at $(date)"
echo "======================================================================"
