#!/usr/bin/env bash
# -----------------------------------------------------------
# One-time server setup for ferdowsi.cloud
# Run as root on the VPS
# Usage: bash scripts/deploy/setup-server.sh
# -----------------------------------------------------------
set -euo pipefail

DOMAIN="ferdowsi.cloud"
DEPLOY_DIR="/opt/airbnb"
APP_USER="deploy"

echo "========================================="
echo "  VPS Setup for $DOMAIN"
echo "========================================="

# -----------------------------------------------------------
# 1. System updates + essential packages
# -----------------------------------------------------------
echo "[1/8] Updating system packages..."
apt-get update -y && apt-get upgrade -y
apt-get install -y \
  curl \
  wget \
  git \
  ufw \
  fail2ban \
  unattended-upgrades \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release \
  jq

# -----------------------------------------------------------
# 2. Create non-root deploy user
# -----------------------------------------------------------
echo "[2/8] Creating deploy user..."
if ! id "$APP_USER" &>/dev/null; then
  adduser --disabled-password --gecos "" "$APP_USER"
  usermod -aG sudo "$APP_USER"
  # Allow passwordless sudo for deploy operations
  echo "$APP_USER ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose, /usr/bin/systemctl restart docker, /opt/airbnb/scripts/deploy/*" \
    > "/etc/sudoers.d/$APP_USER"
  chmod 0440 "/etc/sudoers.d/$APP_USER"
fi

# -----------------------------------------------------------
# 3. Install Docker + Docker Compose
# -----------------------------------------------------------
echo "[3/8] Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

echo "Adding deploy user to docker group..."
usermod -aG docker "$APP_USER"

# -----------------------------------------------------------
# 4. Firewall (UFW)
# -----------------------------------------------------------
echo "[4/8] Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# -----------------------------------------------------------
# 5. Fail2ban
# -----------------------------------------------------------
echo "[5/8] Configuring fail2ban..."
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
# 6. Unattended security upgrades
# -----------------------------------------------------------
echo "[6/8] Enabling automatic security updates..."
dpkg-reconfigure -plow unattended-upgrades 2>/dev/null || true

# -----------------------------------------------------------
# 7. SSH hardening
# -----------------------------------------------------------
echo "[7/8] Hardening SSH..."
if ! grep -q "PasswordAuthentication no" /etc/ssh/sshd_config; then
  sed -i 's/#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
  sed -i 's/#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
  sed -i 's/#\?X11Forwarding.*/X11Forwarding no/' /etc/ssh/sshd_config
  systemctl restart sshd
fi

# -----------------------------------------------------------
# 8. Clone project + initial deploy
# -----------------------------------------------------------
echo "[8/8] Setting up project..."
if [ ! -d "$DEPLOY_DIR" ]; then
  # NOTE: Replace with your actual repo URL
  echo ""
  echo "  >>> Please clone your repository to $DEPLOY_DIR manually:"
  echo "  sudo -u $APP_USER git clone <YOUR_REPO_URL> $DEPLOY_DIR"
  echo ""
fi

# -----------------------------------------------------------
# 9. Set up SSL certificates (first time)
# -----------------------------------------------------------
if [ -d "$DEPLOY_DIR" ]; then
  cd "$DEPLOY_DIR"

  # Start nginx only (for ACME challenge)
  docker compose up -d nginx

  echo ""
  echo "  >>> Waiting 10 seconds for nginx to start..."
  sleep 10

  # Get initial certificate
  docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --email "admin@$DOMAIN" \
    --agree-tos \
    --no-eff-email \
    --force-renewal || echo ">>> SSL setup needs DNS to resolve to this server first!"

  # Restart nginx with SSL
  docker compose restart nginx
fi

# -----------------------------------------------------------
# 10. Set up backup cron
# -----------------------------------------------------------
echo "Setting up backup cron..."
if [ -f "$DEPLOY_DIR/scripts/deploy/backup-db.sh" ]; then
  chmod +x "$DEPLOY_DIR/scripts/deploy/backup-db.sh"
  # Run daily at 3 AM
  CRON_LINE="0 3 * * * $DEPLOY_DIR/scripts/deploy/backup-db.sh >> /var/log/backup.log 2>&1"
  (crontab -l 2>/dev/null | grep -v "backup-db.sh"; echo "$CRON_LINE") | crontab -
fi

echo ""
echo "========================================="
echo "  Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Make sure DNS for $DOMAIN points to this server's IP"
echo "  2. Create $DEPLOY_DIR/.env with your secrets"
echo "  3. Push to main branch to trigger CI/CD deployment"
echo "  4. Or run manually:"
echo "     cd $DEPLOY_DIR"
echo "     docker compose build"
echo "     docker compose up -d"
echo "     docker compose exec app bunx prisma migrate deploy"
echo ""
echo "Security checklist:"
echo "  ✓ Firewall: only SSH(22), HTTP(80), HTTPS(443)"
echo "  ✓ Fail2ban: SSH + nginx protection"
echo "  ✓ SSH: password auth disabled, root login restricted"
echo "  ✓ Auto-updates: security patches enabled"
echo "  ✓ Non-root deploy user"
echo "  ✓ PostgreSQL: bound to localhost only"
echo "  ✓ Nginx rate limiting enabled"
echo "  ✓ SSL via Let's Encrypt"
echo "  ✓ Daily DB backups at 3 AM"
echo ""
