#!/usr/bin/env bash
# -----------------------------------------------------------
# Backup all project databases
# Run daily via cron
# -----------------------------------------------------------
set -euo pipefail

BACKUP_DIR="/opt/backups"
DAYS_TO_KEEP=30
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "[$(date)] === Starting backup of all projects ==="

# Find all projects with a docker-compose.yml
for project_dir in /opt/*/; do
  [ -f "$project_dir/docker-compose.yml" ] || continue
  project=$(basename "$project_dir")

  # Skip the shared directory
  [ "$project" = "shared" ] && continue

  echo "[$(date)] Backing up: $project"

  # Get the db container name
  db_container=$(docker compose -f "$project_dir/docker-compose.yml" ps -q db 2>/dev/null || true)

  if [ -z "$db_container" ]; then
    echo "[$(date)] Skipping $project - db container not running"
    continue
  fi

  # Get postgres user from the container
  pg_user=$(docker exec "$db_container" env | grep POSTGRES_USER | cut -d= -f2 || echo "airbnb")
  pg_db=$(docker exec "$db_container" env | grep POSTGRES_DB | cut -d= -f2 || echo "$project")

  project_backup_dir="$BACKUP_DIR/$project"
  mkdir -p "$project_backup_dir"

  # Dump the database
  docker exec "$db_container" \
    pg_dump -U "$pg_user" -Fc --no-owner --no-acl "$pg_db" \
    > "$project_backup_dir/backup_${DATE}.dump" 2>/dev/null

  if [ ! -s "$project_backup_dir/backup_${DATE}.dump" ]; then
    echo "[$(date)] ERROR: Backup for $project is empty!"
    continue
  fi

  SIZE=$(du -h "$project_backup_dir/backup_${DATE}.dump" | cut -f1)
  echo "[$(date)] $project: $SIZE"

  # Clean old backups
  find "$project_backup_dir" -name "backup_*" -mtime +$DAYS_TO_KEEP -delete
done

echo "[$(date)] === Backup complete ==="

# Summary
TOTAL=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "[$(date)] Total backup size: $TOTAL"
