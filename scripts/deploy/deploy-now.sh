#!/usr/bin/env bash
# -----------------------------------------------------------
# One-shot deploy for airbnb (no git pull; files synced via scp)
# Run: nohup bash /opt/airbnb/deploy-now.sh > /tmp/deploy.log 2>&1 &
# -----------------------------------------------------------
set -euo pipefail
cd /opt/airbnb
set -a
. /opt/airbnb/.env
set +a

echo "=== [1/7] Swap ==="
if [ "$(swapon --show 2>/dev/null | wc -l)" -le 1 ]; then
  if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
  fi
  sudo swapon /swapfile
  echo "Swap enabled (2G)"
else
  echo "Swap already active"
fi

echo "=== [2/7] Pre-pulling base images (retry loop) ==="
for img in oven/bun:1.3 node:22-bookworm-slim; do
  if docker image inspect "$img" > /dev/null 2>&1; then
    echo "$img already present"
    continue
  fi
  pulled=""
  for i in $(seq 1 25); do
    if docker pull -q "$img"; then
      pulled=1
      echo "$img pulled (attempt $i)"
      break
    fi
    sleep 5
  done
  if [ -z "$pulled" ]; then
    echo "FAILED to pull $img after 25 attempts"
    exit 1
  fi
done

echo "=== [3/7] Building image (no-cache) ==="
docker compose build --no-cache app

echo "=== [4/7] Starting services ==="
docker compose up -d

echo "=== [5/7] Waiting for app health ==="
ok=""
for i in $(seq 1 60); do
  if docker compose exec -T app node -e "fetch('http://localhost:3000').then(r=>{if(!r.ok)throw 1}).catch(()=>process.exit(1))" 2>/dev/null; then
    ok=1
    echo "App healthy after ~$((i*3))s"
    break
  fi
  sleep 3
done
if [ -z "$ok" ]; then
  echo "HEALTH-TIMEOUT — last logs:"
  docker compose logs app --tail=60
  exit 1
fi

echo "=== [6/7] Database migrations ==="
docker build --target build -q -t airbnb-buildtools .
docker run --rm --network airbnb_default \
  --env-file /opt/airbnb/.env \
  -e DATABASE_URL="postgresql://${POSTGRES_USER:-airbnb}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-airbnb}?schema=public" \
  airbnb-buildtools npx prisma migrate deploy
echo "Migrations OK"

echo "=== [7/7] Nginx routing (IP phase, HTTP) ==="
NGINX_DIR=/opt/shared/nginx/conf.d
sudo touch "$NGINX_DIR/upstreams.conf"
if ! sudo grep -q "upstream airbnb_app" "$NGINX_DIR/upstreams.conf"; then
  cat << 'EOF' | sudo tee -a "$NGINX_DIR/upstreams.conf" > /dev/null

# airbnb
upstream airbnb_app {
    server airbnb-app-1:3000;
    keepalive 16;
}
EOF
fi

cat << 'EOF' | sudo tee "$NGINX_DIR/airbnb.conf" > /dev/null
# airbnb - IP phase (HTTP only, domain+SSL later)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 94.183.176.45;

    client_max_body_size 15m;

    location /uploads/ {
        proxy_pass http://airbnb_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://airbnb_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Connection "";
        proxy_buffering off;
    }

    location /api/ {
        limit_req zone=api burst=30 nodelay;
        proxy_pass http://airbnb_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 60s;
    }

    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://airbnb_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Connection "";
        proxy_buffering off;
    }
}
EOF

docker exec shared-nginx nginx -t
docker exec shared-nginx nginx -s reload
echo "Nginx reloaded"

echo "=== DEPLOY-DONE ==="
