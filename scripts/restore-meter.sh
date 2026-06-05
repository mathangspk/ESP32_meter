#!/bin/bash
# ==============================================================================
# ESP32/ESP8266 Meter System - Unified Restore and Disaster Recovery Script
# Downloads backups from Google Drive, decrypts AES-256 archives, recreates the
# deployment folders, starts Docker services, and restores the MongoDB database.
# ==============================================================================
set -euo pipefail

# Configurations
BACKUP_DIR="/home/tma_agi/mongodb_backups"
DEPLOY_DIR="/home/tma_agi/esp32_loss_power_deploy"
DB_NAME="esp32_power_monitor"
CONTAINER="esp32losspowerdeploy_mongodb_1"
RCLONE_DIR="tma-agi-backup:esp32_meter"

# Resolve rclone command path
RCLONE_CMD="rclone"
if [ -f "/home/tma_agi/rclone" ]; then
    RCLONE_CMD="/home/tma_agi/rclone"
fi

# Resolve Docker Compose command
COMPOSE_CMD="docker compose"
if command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
fi

usage() {
    cat <<EOF
Usage:
  $0 [options]

Options:
  --list                List available backup packages on Google Drive
  --file FILENAME       Restore a specific backup file (e.g. meter_backup_20260523_120000.tar.gz.enc)
  --latest              Automatically restore the latest backup found on Google Drive
  --help                Show this help message
EOF
    exit 0
}

# Parse command line options
if [ $# -eq 0 ]; then
    usage
fi

ACTION=""
FILE_TO_RESTORE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --list)
            ACTION="LIST"
            shift
            ;;
        --latest)
            ACTION="LATEST"
            shift
            ;;
        --file)
            ACTION="FILE"
            FILE_TO_RESTORE="$2"
            shift 2
            ;;
        --help)
            usage
            ;;
        *)
            echo "Unknown argument: $1" >&2
            usage
            ;;
    esac
done

# Check rclone remote availability (only if we need GDrive)
NEED_RCLONE=0
if [ "$ACTION" == "LIST" ] || [ "$ACTION" == "LATEST" ]; then
    NEED_RCLONE=1
elif [ "$ACTION" == "FILE" ] && [ ! -f "$BACKUP_DIR/$FILE_TO_RESTORE" ]; then
    NEED_RCLONE=1
fi

if [ "$NEED_RCLONE" -eq 1 ]; then
    if ! command -v "$RCLONE_CMD" &>/dev/null || ! $RCLONE_CMD listremotes 2>/dev/null | grep -q "^$(echo "$RCLONE_DIR" | cut -d':' -f1):"; then
        echo "ERROR: rclone remote '$(echo "$RCLONE_DIR" | cut -d':' -f1)' is not configured!" >&2
        echo "This is required to fetch backups from Google Drive." >&2
        exit 1
    fi
fi

if [ "$ACTION" == "LIST" ]; then
    echo "Available backup packages on Google Drive:"
    $RCLONE_CMD lsf "$RCLONE_DIR/" | grep "^meter_backup_" | sort -r
    exit 0
fi

if [ "$ACTION" == "LATEST" ]; then
    echo "Finding latest backup on Google Drive..."
    FILE_TO_RESTORE=$($RCLONE_CMD lsf "$RCLONE_DIR/" | grep "^meter_backup_" | sort | tail -n 1)
    if [ -z "$FILE_TO_RESTORE" ]; then
        echo "ERROR: No backups found on Google Drive remote '$RCLONE_DIR'." >&2
        exit 1
    fi
    echo "Latest backup found: $FILE_TO_RESTORE"
fi

if [ -z "$FILE_TO_RESTORE" ]; then
    echo "ERROR: No backup file specified for restoration." >&2
    exit 1
fi

echo "======================================================================"
echo "Starting System Restoration: $(date)"
echo "Target Backup Archive:       $FILE_TO_RESTORE"
echo "======================================================================"

# 1. Fetch the backup file from Google Drive
echo "[1/7] Fetching the backup file..."
mkdir -p "$BACKUP_DIR"
if [ -f "$BACKUP_DIR/$FILE_TO_RESTORE" ]; then
    echo "      Backup file found locally: $BACKUP_DIR/$FILE_TO_RESTORE"
else
    echo "      Downloading backup from Google Drive..."
    $RCLONE_CMD copy "$RCLONE_DIR/$FILE_TO_RESTORE" "$BACKUP_DIR/"
    echo "      Download completed successfully."
fi

# 2. Decrypt the archive if encrypted (.enc)
cd "$BACKUP_DIR"
DECRYPTED_FILE=""
if [[ "$FILE_TO_RESTORE" == *.enc ]]; then
    echo "[2/7] Backup package is encrypted. Resolving key..."
    
    ENCRYPT_KEY=""
    # Check if local deployment already has .env.prod with keys
    if [ -f "$DEPLOY_DIR/.env.prod" ]; then
        ENCRYPT_KEY=$(grep -E "^BACKUP_PASSPHRASE=" "$DEPLOY_DIR/.env.prod" | cut -d'=' -f2- || true)
        if [ -z "$ENCRYPT_KEY" ]; then
            ENCRYPT_KEY=$(grep -E "^JWT_SECRET=" "$DEPLOY_DIR/.env.prod" | cut -d'=' -f2- || true)
        fi
        if [ -n "$ENCRYPT_KEY" ]; then
            echo "      Found passphrase inside existing local .env.prod config."
        fi
    fi
    
    # Prompt user if key not found
    if [ -z "$ENCRYPT_KEY" ]; then
        read -s -p "      Enter decryption passphrase: " USER_KEY
        echo ""
        ENCRYPT_KEY="$USER_KEY"
    fi
    
    BASENAME="${FILE_TO_RESTORE%.enc}"
    if openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -k "$ENCRYPT_KEY" -in "$FILE_TO_RESTORE" -out "$BASENAME" 2>/dev/null; then
        DECRYPTED_FILE="$BASENAME"
        echo "      Decryption completed successfully."
    else
        echo "      ERROR: Decryption failed! Please verify the passphrase." >&2
        exit 1
    fi
else
    DECRYPTED_FILE="$FILE_TO_RESTORE"
    echo "[2/7] Backup package is unencrypted. Proceeding directly."
fi

# 3. Extract Backup Package
echo "[3/7] Extracting backup package..."
TEMP_EXTRACT_DIR="/tmp/meter_restore_$(date +%s)"
mkdir -p "$TEMP_EXTRACT_DIR"
tar -xzf "$DECRYPTED_FILE" -C "$TEMP_EXTRACT_DIR"

# Identify extracted directory name (e.g. meter_backup_YYYYMMDD_HHMMSS)
FOLDER_NAME=$(ls "$TEMP_EXTRACT_DIR" | grep "^meter_backup_" | head -n 1)
EXTRACTED_PATH="$TEMP_EXTRACT_DIR/$FOLDER_NAME"
echo "      Extracted content located at: $EXTRACTED_PATH"

# 4. Restore configurations and environments
echo "[4/7] Restoring configuration and environments..."
mkdir -p "$DEPLOY_DIR/infra"

if [ -f "$EXTRACTED_PATH/config/.env.prod" ]; then
    # Create backup of current config if exists
    [ -f "$DEPLOY_DIR/.env.prod" ] && cp "$DEPLOY_DIR/.env.prod" "$DEPLOY_DIR/.env.prod.bak_$(date +%s)"
    cp "$EXTRACTED_PATH/config/.env.prod" "$DEPLOY_DIR/.env.prod"
    echo "      - Restored .env.prod"
fi

if [ -f "$EXTRACTED_PATH/config/docker-compose.deploy.yml" ]; then
    cp "$EXTRACTED_PATH/config/docker-compose.deploy.yml" "$DEPLOY_DIR/docker-compose.deploy.yml"
    echo "      - Restored docker-compose.deploy.yml"
fi

if [ -f "$EXTRACTED_PATH/config/docker-compose.vps.yml" ]; then
    cp "$EXTRACTED_PATH/config/docker-compose.vps.yml" "$DEPLOY_DIR/docker-compose.vps.yml"
    echo "      - Restored docker-compose.vps.yml"
fi

if [ -d "$EXTRACTED_PATH/config/infra" ]; then
    cp -r "$EXTRACTED_PATH/config/infra/"* "$DEPLOY_DIR/infra/"
    echo "      - Restored infra configurations"
fi

# 5. Boot up Docker Services
echo "[5/7] Deploying application containers via Docker Compose..."
cd "$DEPLOY_DIR"
# Use VPS pull/rebuild policy
if DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config $COMPOSE_CMD -f docker-compose.deploy.yml up -d; then
    echo "      Docker services started successfully."
else
    echo "      WARNING: Failed to boot using docker-compose.deploy.yml. Retrying with build flag..."
    DOCKER_CONFIG=/home/tma_agi/ghcr-docker-config $COMPOSE_CMD -f docker-compose.deploy.yml up -d --build
fi

echo "      Waiting 8 seconds for MongoDB container to fully initialize..."
sleep 8

# 6. Restore MongoDB database dump
echo "[6/7] Restoring MongoDB database collections..."
if [ -d "$EXTRACTED_PATH/db/$DB_NAME" ]; then
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
        # Copy raw dump directory into MongoDB container temp space
        docker cp "$EXTRACTED_PATH/db/$DB_NAME" "${CONTAINER}:/tmp/"
        
        # Execute mongorestore (drops existing collections to avoid duplicates)
        if docker exec "$CONTAINER" mongorestore --db "$DB_NAME" "/tmp/$DB_NAME" --drop --quiet; then
            echo "      Database collections restored successfully."
        else
            echo "      ERROR: Failed to run mongorestore command!" >&2
        fi
        
        # Clean up temporary dump inside container
        docker exec "$CONTAINER" rm -rf "/tmp/$DB_NAME"
    else
        echo "      ERROR: MongoDB container '$CONTAINER' is not running! Restoration aborted." >&2
    fi
else
    echo "      WARNING: No MongoDB database dump found in backup package."
fi

# 7. Post-restoration clean up
echo "[7/7] Cleaning up local temporary restoration files..."
rm -rf "$TEMP_EXTRACT_DIR"
if [[ "$FILE_TO_RESTORE" == *.enc ]]; then
    rm -f "$DECRYPTED_FILE"
fi
echo "      Temporary files cleaned up successfully."

echo "======================================================================"
echo "System Restoration Completed Successfully at $(date)"
echo "======================================================================"
