#!/usr/bin/env bash
set -euo pipefail

echo "=== Notification status counts ==="
docker exec -i esp32losspowerdeploy_mongodb_1 mongosh esp32_power_monitor --eval "
  db.notification_queue.aggregate([
    { \$group: { _id: '\$status', count: { \$sum: 1 } } }
  ]).toArray()
"






