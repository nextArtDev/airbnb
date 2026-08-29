#!/usr/bin/env bash
# -----------------------------------------------------------
# Set up shared nginx reverse proxy
# Run once on the VPS
# -----------------------------------------------------------
set -euo pipefail

SHARED_DIR="/opt/shared"

echo "========================================="
echo "  Setting up shared reverse proxy"
echo "========================================="

# Create directory structure
mkdir -p "$SHARED_DIR/nginx/conf.d"
mkdir -p /var/www/certbot

# Copy config files (if not already there)
if [ ! -f "$SHARED_DIR/nginx/nginx.conf" ]; then
  echo "Copying nginx config..."
  cp scripts/deploy/shared/nginx.conf "$SHARED_DIR/nginx/nginx.conf"
fi

# Create upstreams.conf (empty initially)
if [ ! -f "$SHARED_DIR/nginx/conf.d/upstreams.conf" ]; then
  touch "$SHARED_DIR/nginx/conf.d/upstreams.conf"
fi

# Start nginx
cd "$SHARED_DIR"
docker compose up -d nginx

echo ""
echo "Shared reverse proxy is running!"
echo ""
echo "To add a project, run:"
echo "  bash scripts/deploy/shared/add-project-nginx.sh <project-name>"
echo ""
echo "To get SSL for a new subdomain:"
echo "  docker compose run --rm certbot certonly \\"
echo "    --webroot --webroot-path=/var/www/certbot \\"
echo "    -d <project>.ferdowsi.cloud \\"
echo "    --email admin@ferdowsi.cloud --agree-tos --no-eff-email"
