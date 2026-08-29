#!/usr/bin/env bash
# -----------------------------------------------------------
# Manual deployment script (run on the VPS)
# Usage: bash scripts/deploy/deploy.sh
# -----------------------------------------------------------
set -euo pipefail

cd /opt/airbnb

echo "=== 1. Pulling latest code ==="
git pull origin main

echo "=== 2. Building Docker image ==="
docker compose build --no-cache app

echo "=== 3. Running database migrations ==="
docker compose run --rm app bunx prisma migrate deploy

echo "=== 4. Restarting services ==="
docker compose up -d --force-recreate app

echo "=== 5. Cleaning up old images ==="
docker image prune -f

echo "=== 6. Health check ==="
sleep 5
for i in $(seq 1 30); do
  if docker compose exec -T app bun -e "fetch('http://localhost:3000').then(r=>{if(!r.ok)throw 1}).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "=== Deploy successful! App is healthy. ==="
    exit 0
  fi
  echo "Waiting for app to start... ($i/30)"
  sleep 2
done

echo "=== WARNING: Health check failed ==="
docker compose logs app --tail=50
exit 1
