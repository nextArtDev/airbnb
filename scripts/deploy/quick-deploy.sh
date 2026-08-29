#!/usr/bin/env bash
# -----------------------------------------------------------
# One-command deploy for airbnb on VPS
# Run: bash scripts/deploy/quick-deploy.sh
# -----------------------------------------------------------
set -euo pipefail

DEPLOY_DIR="/opt/airbnb"
SHARED_DIR="/opt/shared"
PROJECT="airbnb"

echo "========================================="
echo "  Deploying $PROJECT"
echo "========================================="

cd "$DEPLOY_DIR"

# --- 1. Pull latest code ---
echo ""
echo "[1/6] Pulling latest code..."
git pull origin main

# --- 2. Check .env exists ---
if [ ! -f .env ]; then
  echo "ERROR: .env file not found!"
  echo "Create it: cp .env.production.example .env && nano .env"
  exit 1
fi

# --- 3. Fix Docker DNS ---
echo ""
echo "[2/6] Configuring Docker DNS..."
sudo bash -c 'cat > /etc/docker/daemon.json << EOF
{
  "dns": ["8.8.8.8", "8.8.4.4"],
  "ip6tables": false
}
EOF'
sudo systemctl restart docker
sleep 3

# --- 4. Create shared network + nginx ---
echo ""
echo "[3/6] Setting up shared nginx..."
if ! docker network inspect shared-proxy >/dev/null 2>&1; then
  docker network create shared-proxy
  echo "Created shared-proxy network"
fi

mkdir -p "$SHARED_DIR/nginx/conf.d"
mkdir -p /var/www/certbot

# Copy shared docker-compose if not there
if [ ! -f "$SHARED_DIR/docker-compose.yml" ]; then
  cp "$DEPLOY_DIR/scripts/deploy/shared/docker-compose.yml" "$SHARED_DIR/docker-compose.yml"
fi
if [ ! -f "$SHARED_DIR/nginx/nginx.conf" ]; then
  cp "$DEPLOY_DIR/scripts/deploy/shared/nginx.conf" "$SHARED_DIR/nginx/nginx.conf"
fi
touch "$SHARED_DIR/nginx/conf.d/upstreams.conf"

# Start shared nginx
cd "$SHARED_DIR"
docker compose up -d nginx
cd "$DEPLOY_DIR"

# --- 5. Build & start app ---
echo ""
echo "[4/6] Building Docker image (this takes a few minutes)..."
docker compose build --no-cache app

echo ""
echo "[5/6] Starting services..."
docker compose up -d

# Wait for health
echo "Waiting for app to be healthy..."
for i in $(seq 1 60); do
  if docker compose exec -T app bun -e "fetch('http://localhost:3000').then(r=>{if(!r.ok)throw 1}).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "App is healthy!"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "WARNING: Health check timed out. Checking logs..."
    docker compose logs app --tail=30
  fi
  sleep 3
done

# --- 6. Run migrations ---
echo ""
echo "[6/6] Running database migrations..."
docker compose exec -T app bunx prisma migrate deploy

# --- 7. Set up nginx routing ---
echo ""
echo "Setting up nginx routing..."
bash "$DEPLOY_DIR/scripts/deploy/shared/add-project-nginx.sh" "$PROJECT"

# Reload nginx
docker compose -f "$SHARED_DIR/docker-compose.yml" exec nginx nginx -s reload

echo ""
echo "========================================="
echo "  Deployment Complete!"
echo "========================================="
echo ""
echo "  App:       http://94.183.176.45"
echo "  Logs:      docker compose logs app --tail=50"
echo "  Restart:   docker compose restart app"
echo ""
