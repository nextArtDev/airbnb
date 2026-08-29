#!/usr/bin/env bash
# -----------------------------------------------------------
# Add nginx config for a new project
# Usage: ./add-project-nginx.sh <project-name> [docker-network-name]
# -----------------------------------------------------------
set -euo pipefail

PROJECT_NAME="${1:?Usage: $0 <project-name> [network-name]}"
NETWORK_NAME="${2:-${PROJECT_NAME}_default}"
NGINX_DIR="/opt/shared/nginx/conf.d"

if [ -f "$NGINX_DIR/${PROJECT_NAME}.conf" ]; then
  echo "Error: $NGINX_DIR/${PROJECT_NAME}.conf already exists"
  exit 1
fi

# --- Add upstream ---
cat >> "$NGINX_DIR/upstreams.conf" << UPSTREAM

# ${PROJECT_NAME}
upstream ${PROJECT_NAME}_app {
    server ${PROJECT_NAME}-app-1:3000;
    keepalive 16;
}
UPSTREAM

# --- Add HTTP → HTTPS redirect ---
cat > "$NGINX_DIR/${PROJECT_NAME}.conf" << CONF
# -----------------------------------------------------------
# ${PROJECT_NAME} - ${PROJECT_NAME}.ferdowsi.cloud
# -----------------------------------------------------------

# HTTP redirect
server {
    listen 80;
    listen [::]:80;
    server_name ${PROJECT_NAME}.ferdowsi.cloud;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${PROJECT_NAME}.ferdowsi.cloud;

    # SSL (will be created by certbot)
    ssl_certificate     /etc/letsencrypt/live/${PROJECT_NAME}.ferdowsi.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${PROJECT_NAME}.ferdowsi.cloud/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Upload images (bypass Node.js)
    location /uploads/ {
        proxy_pass http://${PROJECT_NAME}_app;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Auth API - strict rate limit
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://${PROJECT_NAME}_app;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
    }

    # Other API routes
    location /api/ {
        limit_req zone=api burst=30 nodelay;
        proxy_pass http://${PROJECT_NAME}_app;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 60s;
    }

    # App
    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://${PROJECT_NAME}_app;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
    }

    # Block dotfiles
    location ~ /\\. {
        deny all;
    }
}
CONF

echo "Created nginx config for ${PROJECT_NAME}"
echo ""
echo "Next steps:"
echo "  1. Get SSL certificate:"
echo "     docker compose -f /opt/shared/docker-compose.yml run --rm certbot certonly \\"
echo "       --webroot --webroot-path=/var/www/certbot \\"
echo "       -d ${PROJECT_NAME}.ferdowsi.cloud \\"
echo "       -d www.${PROJECT_NAME}.ferdowsi.cloud \\"
echo "       --email admin@ferdowsi.cloud --agree-tos --no-eff-email"
echo ""
echo "  2. Reload nginx:"
echo "     docker compose -f /opt/shared/docker-compose.yml exec nginx nginx -s reload"
