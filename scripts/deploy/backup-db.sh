#!/usr/bin/env bash
# -----------------------------------------------------------
# PostgreSQL backup script
# Keeps last 30 days of backups
# -----------------------------------------------------------
set -euo pipefail

BACKUP_DIR="/opt/airbnb/backups"
CONTAINER_NAME="airbnb-db-1"
DAYS_TO_KEEP=30
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

# Dump the database
docker exec "$CONTAINER_NAME" \
  pg_dump -U airbnb -Fc --no-owner --no-acl airbnb \
  > "$BACKUP_DIR/backup_${DATE}.dump"

# Also create a plain SQL backup for easy inspection
docker exec "$CONTAINER_NAME" \
  pg_dump -U airbnb --no-owner --no-acl airbnb \
  | gzip > "$BACKUP_DIR/backup_${DATE}.sql.gz"

# Verify backup is not empty
if [ ! -s "$BACKUP_DIR/backup_${DATE}.dump" ]; then
  echo "[$(date)] ERROR: Backup file is empty!"
  exit 1
fi

SIZE=$(du -h "$BACKUP_DIR/backup_${DATE}.dump" | cut -f1)
echo "[$(date)] Backup completed: $SIZE"

# Clean up old backups
echo "[$(date)] Cleaning backups older than $DAYS_TO_KEEP days..."
find "$BACKUP_DIR" -name "backup_*" -mtime +$DAYS_TO_KEEP -delete

TOTAL=$(du -sh "$BACKUP_DIR" | cut -f1)
COUNT=$(ls -1 "$BACKUP_DIR"/backup_* 2>/dev/null | wc -l)
echo "[$(date)] Total backups: $COUNT, disk usage: $TOTAL"
