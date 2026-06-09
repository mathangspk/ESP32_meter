#!/bin/bash
# ==============================================================================
# ESP32/ESP8266 Meter System - Configuration Metadata Synchronization Script
# Dumps system configuration (users, devices, claims...) on the primary VPS
# (excluding heavy telemetry collections), transfers it to the backup VPS,
# and restores it to keep the backup VPS database configuration in sync.
# ==============================================================================
set -euo pipefail

DB_NAME="esp32_power_monitor"
PRIMARY_CONTAINER="esp32losspowerdeploy_mongodb_1"
BACKUP_CONTAINER="esp32_loss_power_deploy-mongodb-1"
BACKUP_HOST="managetool-vps"

echo "=== System Metadata Sync Started: $(date) ==="

# 1. Run mongodump on primary MongoDB container (excluding telemetry collections)
echo "[1/4] Dumping metadata collections on primary VPS..."
docker exec "$PRIMARY_CONTAINER" mongodump \
  --db "$DB_NAME" \
  --excludeCollection="telemetry" \
  --excludeCollection="telemetry_hourly" \
  --out="/tmp/metadata_dump" --quiet

# 2. Copy the dump from the container to primary VPS host
rm -rf /tmp/metadata_dump
docker cp "${PRIMARY_CONTAINER}:/tmp/metadata_dump/${DB_NAME}" /tmp/metadata_dump
docker exec "$PRIMARY_CONTAINER" rm -rf /tmp/metadata_dump

# 3. Compress the metadata dump and clean up uncompressed folder
cd /tmp
tar -czf metadata_dump.tar.gz metadata_dump
rm -rf metadata_dump

# 4. Transfer the archive to the backup VPS
echo "[2/4] Transferring metadata dump to backup VPS..."
scp metadata_dump.tar.gz "${BACKUP_HOST}:/tmp/"
rm -f metadata_dump.tar.gz

# 5. Restore the dump on the backup VPS
echo "[3/4] Restoring metadata collections on backup VPS..."
ssh "$BACKUP_HOST" bash << EOF
  set -euo pipefail
  rm -rf /tmp/metadata_dump
  tar -xzf /tmp/metadata_dump.tar.gz -C /tmp/
  docker cp /tmp/metadata_dump $BACKUP_CONTAINER:/tmp/
  docker exec $BACKUP_CONTAINER mongorestore --db $DB_NAME /tmp/metadata_dump --drop --quiet
  docker exec $BACKUP_CONTAINER rm -rf /tmp/metadata_dump
  rm -rf /tmp/metadata_dump /tmp/metadata_dump.tar.gz
EOF

echo "[4/4] Metadata synchronization completed."
echo "=== Sync Completed Successfully at $(date) ==="
