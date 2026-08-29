#!/usr/bin/env bash
# -----------------------------------------------------------
# Multi-project VPS setup for ferdowsi.cloud
# Run as root on the VPS (one time)
# -----------------------------------------------------------
set -euo pipefail

DOMAIN="ferdowsi.cloud"
SHARED_DIR="/opt/shared"
APP_USER="deploy"

echo "========================================="
echo "  Multi-Project VPS Setup"
echo "  Domain: $DOMAIN"
echo "========================================="

# -----------------------------------------------------------
# 1. System updates + essential packages
# -----------------------------------------------------------
echo "[1/9] Updating system packages..."
apt-get update -y && apt-get upgrade -y
apt-get install -y \
  curl wget git jq \
  ufw fail2ban unattended-upgrades \
  apt-transport-https ca-certificates gnupg lsb-release

# -----------------------------------------------------------
# 2. Create non-root deploy user
# -----------------------------------------------------------
echo "[2/9] Creating deploy user..."
if ! id "$APP_USER" &>/dev/null; then
  adduser --disabled-password --gecos "" "$APP_USER"
  usermod -aG sudo "$APP_USER"
  echo "$APP_USER ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker compose, /usr/bin/systemctl, /opt/*/scripts/deploy/*" \
    > "/etc/sudoers.d/$APP_USER"
  chmod 0440 "/etc/sudoers.d/$APP_USER"
fi

# -----------------------------------------------------------
# 3. Install Docker + Docker Compose
# -----------------------------------------------------------
echo "[3/9] Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi
usermod -aG docker "$APP_USER"

# -----------------------------------------------------------
# 4. Firewall (UFW)
# -----------------------------------------------------------
echo "[4/9] Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# -----------------------------------------------------------
# 5. Fail2ban
# -----------------------------------------------------------
echo "[5/9] Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
EOF
systemctl enable fail2ban
systemctl restart fail2ban

# -----------------------------------------------------------
# 6. Auto security updates
# -----------------------------------------------------------
echo "[6/9] Enabling automatic security updates..."
dpkg-reconfigure -plow unattended-upgrades 2>/dev/null || true

# -----------------------------------------------------------
# 7. SSH hardening
# -----------------------------------------------------------
echo "[7/9] Hardening SSH..."
if ! grep -q "PasswordAuthentication no" /etc/ssh/sshd_config; then
  sed -i 's/#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
  sed -i 's/#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
  sed -i 's/#\?X11Forwarding.*/X11Forwarding no/' /etc/ssh/sshd_config
  systemctl restart sshd
fi

# -----------------------------------------------------------
# 8. Set up shared reverse proxy
# -----------------------------------------------------------
echo "[8/9] Setting up shared reverse proxy..."
mkdir -p "$SHARED_DIR/nginx/conf.d"
mkdir -p /var/www/certbot

# Copy shared configs if they exist in the repo
if [ -f scripts/deploy/shared/nginx.conf ]; then
  cp scripts/deploy/shared/nginx.conf "$SHARED_DIR/nginx/nginx.conf"
fi
if [ -f scripts/deploy/shared/docker-compose.yml ]; then
  cp scripts/deploy/shared/docker-compose.yml "$SHARED_DIR/docker-compose.yml"
fi

# Create empty upstreams
touch "$SHARED_DIR/nginx/conf.d/upstreams.conf"

# Start shared nginx
cd "$SHARED_DIR"
docker compose up -d nginx

# -----------------------------------------------------------
# 9. Backup cron
# -----------------------------------------------------------
echo "[9/9] Setting up backup cron..."
if [ -f scripts/deploy/backup-db.sh ]; then
  chmod +x scripts/deploy/backup-db.sh
  # Backup all projects' databases daily at 3 AM
  CRON_LINE="0 3 * * * /opt/shared/scripts/backup-all.sh >> /var/log/backup.log 2>&1"
  (crontab -l 2>/dev/null | grep -v "backup-all.sh"; echo "$CRON_LINE") | crontab -
fi

echo ""
echo "========================================="
echo "  VPS Setup Complete!"
echo "========================================="
echo ""
echo "Architecture:"
echo "  /opt/shared/        → Shared nginx reverse proxy"
echo "  /opt/<project>/     → Each project (app + postgres)"
echo "  *.ferdowsi.cloud    → Subdomain routing"
echo ""
echo "To deploy your first project:"
echo "  1. cd /opt"
echo "  2. git clone <your-repo> airbnb"
echo "  3. cd airbnb"
echo "  4. cp .env.production.example .env && nano .env"
echo "  5. docker compose build && docker compose up -d"
echo "  6. docker compose exec app bunx prisma migrate deploy"
echo "  7. bash scripts/deploy/shared/add-project-nginx.sh airbnb"
echo "  8. docker compose -f /opt/shared/docker-compose.yml run --rm certbot certonly \\"
echo "       --webroot --webroot-path=/var/www/certbot \\"
echo "       -d airbnb.ferdowsi.cloud --email admin@ferdowsi.cloud --agree-tos --no-eff-email"
echo "  9. docker compose -f /opt/shared/docker-compose.yml exec nginx nginx -s reload"
echo ""
echo "To add more projects later:"
echo "  bash scripts/deploy/shared/add-project-nginx.sh <project-name>"
echo ""
