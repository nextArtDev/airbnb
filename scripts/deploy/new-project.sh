#!/usr/bin/env bash
# -----------------------------------------------------------
# Per-project Docker Compose template
# Copy this to /opt/<project-name>/ and customize
# -----------------------------------------------------------
set -euo pipefail

PROJECT_NAME="${1:?Usage: $0 <project-name>}"
PROJECT_DIR="/opt/$PROJECT_NAME"
APP_PORT="${2:-3000}"  # Unique port per project if needed (optional)

if [ -d "$PROJECT_DIR" ]; then
  echo "Error: $PROJECT_DIR already exists"
  exit 1
fi

mkdir -p "$PROJECT_DIR"

cat > "$PROJECT_DIR/docker-compose.yml" << COMPOSE
services:
  # -----------------------------------------------------------
  # PostgreSQL
  # -----------------------------------------------------------
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-${PROJECT_NAME}}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
      POSTGRES_DB: ${POSTGRES_DB:-${PROJECT_NAME}}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:543${PROJECT_NAME:0:1}:5432"  # Unique port per project
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER:-${PROJECT_NAME}}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # -----------------------------------------------------------
  # Application
  # -----------------------------------------------------------
  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://\${POSTGRES_USER:-${PROJECT_NAME}}:\${POSTGRES_PASSWORD}@db:5432/\${POSTGRES_DB:-${PROJECT_NAME}}?schema=public
      BETTER_AUTH_SECRET: \${BETTER_AUTH_SECRET:-}
      BETTER_AUTH_URL: \${BETTER_AUTH_URL:-https://${PROJECT_NAME}.ferdowsi.cloud}
      NEXTAUTH_URL: \${NEXTAUTH_URL:-https://${PROJECT_NAME}.ferdowsi.cloud}
      STORAGE_PATH: /app/uploads
      # Add your other env vars here
    volumes:
      - uploads_data:/app/uploads
    expose:
      - "3000"
    healthcheck:
      test: ["CMD", "bun", "-e", "fetch('http://localhost:3000').then(r=>{if(!r.ok)throw 1}).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  postgres_data:
  uploads_data:
COMPOSE

echo "Created $PROJECT_DIR/docker-compose.yml"
echo "Next steps:"
echo "  1. cd $PROJECT_DIR"
echo "  2. Copy your project files here (or clone your repo)"
echo "  3. Create .env (use .env.production.example as template)"
echo "  4. Add nginx config in /opt/shared/nginx/conf.d/${PROJECT_NAME}.conf"
echo "  5. Run: docker compose build && docker compose up -d"
