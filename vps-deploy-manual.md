# VPS Deploy Manual

**Deploying a Next.js (TypeScript) + Prisma + PostgreSQL + Auth app on a Ferdowsi Cloud VPS with GitHub CI/CD**

This manual documents a proven, battle-tested deployment pipeline. Every "gotcha" section below comes from a real incident — read them before skipping steps.

---

## 0. Architecture Overview

```
Visitors
   │
   ▼
CDN (e.g. MizbanCloud, kosar-clinic-mis.ir)
   │
   ▼
Ferdowsi VPS (1 GB RAM class)
   │
   ├── nginx container  (port 80 → the only exposed port)
   │      ├── /uploads/*  → served directly from disk (alias)
   │      └── everything else → proxy_pass http://app:3000
   │
   ├── app container     (Next.js standalone: node server.js)
   ├── postgres container (postgres:17-alpine, internal only)
   └── migrate container (one-shot: prisma migrate deploy, ops profile)

GitHub repo (private)
   └── on push to main → GitHub Actions builds images → publishes to ghcr.io
```

**Key principle for Iranian VPS networks (the reason this pipeline looks the way it does):**

| Path from Ferdowsi VPS | Reliability |
|---|---|
| github.com / api.github.com | ✅ stable, fast (~0.5–1 s) |
| ghcr.io (GitHub Container Registry) | ⚠️ flaky (TLS handshake timeouts ~50% of the time), retries needed |
| npmjs.org | ✅ usually fine |
| archive.ubuntu.com (apt) | ❌ often hangs — avoid `apt` on the VPS |
| Building on the VPS itself | ❌ NEVER — a Next.js build OOMs/freezes a 1 GB machine even with swap |

Therefore: **all builds happen on GitHub Actions** (or your own machine). The VPS only ever *pulls* finished images. There is also a chunked GitHub Release fallback for when ghcr.io is being hostile.

---

## 1. One-Time: Prepare the VPS

### 1.1 First login

Ferdowsi gives you a root or ubuntu password through their dashboard.

```powershell
# From your Windows machine
ssh ubuntu@<VPS_IP>
```

If you get `kex_exchange_identification: read: Connection reset` — the box is either frozen (see §7) or sshd is throttled under brute-force load (Ferdowsi is scanned constantly; ~11k failed auths/day was observed). Reset the machine from the Ferdowsi dashboard; that clears it temporarily. §1.3 fixes it permanently.

### 1.2 Create an automation SSH key (on your Windows machine)

Generate a **passphrase-less** key dedicated to deploys. A passphrase-protected key cannot be used by scripts/CI.

```powershell
ssh-keygen -t ed25519 -f "$HOME\.ssh\id_ed25519_deploy" -N '""' -C "deploy"
```

Authorize it on the VPS (asks for your password one last time):

```
type C:\Users\<you>\.ssh\id_ed25519_deploy.pub | ssh ubuntu@<VPS_IP> "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys && echo OK"
```

Verify passwordless login works:

```powershell
ssh -i C:\Users\<you>\.ssh\id_ed25519_deploy -o IdentitiesOnly=yes ubuntu@<VPS_IP> whoami
```

> **Windows gotcha:** if you also want your normal key in an agent, the `ssh-agent` service must be enabled from an **Administrator** PowerShell:
> `Set-Service ssh-agent -StartupType Automatic; Start-Service ssh-agent`

### 1.3 Add swap — CRITICAL on ≤ 1 GB plans

Ferdowsi's smallest plans come with 961 MB RAM and **zero swap**. Without swap, any memory spike hard-freezes the VM (and Ferdowsi's hypervisor memory-ballooning makes it worse). This single step removes 80% of the "my app freezes every few days" problem:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=20' | sudo tee /etc/sysctl.d/99-swap.conf
sudo sysctl -p /etc/sysctl.d/99-swap.conf
free -h   # Swap: 2.0Gi
```

### 1.4 Harden SSH — the brute-force reality

Ferdowsi IPs are under permanent SSH brute-force attack. Unthrottled, this saturates sshd (`MaxStartups throttling`) and makes SSH unusable even when the site is up.

Create `/etc/ssh/sshd_config.d/00-hardening.conf`:

```bash
sudo tee /etc/ssh/sshd_config.d/00-hardening.conf >/dev/null <<'EOF'
# Must sort BEFORE 50-cloud-init.conf: OpenSSH uses FIRST-match-wins,
# and cloud-init's drop-in re-enables passwords.
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
LoginGraceTime 15
MaxStartups 30:30:200
EOF
sudo sshd -t && sudo systemctl reload ssh
```

> **Gotcha:** OpenSSH config is *first-match-wins*. `50-cloud-init.conf` sets `PasswordAuthentication yes`. A file named `99-...` will NOT override it — name yours `00-...` so it wins. Always open a NEW ssh session to verify you're not locked out before closing the current one. If you do lock yourself out, the Ferdowsi dashboard VNC console still accepts the machine password.

### 1.5 Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp   # if you terminate TLS on the box; with an external CDN you may not need it
sudo ufw enable
sudo ufw status
```

Don't open 3000/8080 publicly — containers talk over the internal Docker network.

### 1.6 Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu   # then log out/in once
docker compose version
```

---

## 2. One-Time: Server Directory Layout

```
/srv/<app>/                     # deploy root (NOT a git clone)
├── docker-compose.prod.yml     # server-side compose (may differ slightly from repo!)
├── .env                        # RUNTIME secrets — DATABASE_URL, AUTH_SECRET, AUTH_TRUST_HOST...
├── .deploy.env                 # which image tags to run (APP_IMAGE, MIGRATION_IMAGE)
├── nginx.conf                  # mounted into the nginx container
└── polyfill.js                 # optional, preloaded via `node -r`
```

`.env` (never committed — it's in `.gitignore`):

```
DATABASE_URL=postgresql://<user>:<pass>@postgres:5432/<db>?schema=public
AUTH_SECRET=<random 32 hex>
AUTH_TRUST_HOST=true
NEXT_PUBLIC_BASE_URL=https://your-domain.ir
VERIFY_CODE=<if your app uses one>
UPLOAD_DIR=/app/uploads
POSTGRES_DB=<db>
POSTGRES_USER=<user>
POSTGRES_PASSWORD=<pass>
```

`.deploy.env`:

```
APP_IMAGE=<app>:latest
MIGRATION_IMAGE=<app>:migrate-latest
```

> **Never commit `.tar` files or images to git.** A 502 MB tar in history makes every push fragile (HTTP 408s, 179 MB packs). If it already happened, collapse unpushed commits: `git reset --soft origin/main && git add -A && git commit -m "..."` — the blob vanishes from the new history.

---

## 3. One-Time: Repository Requirements

### 3.1 Dockerfile (multi-stage)

Four targets: `dependencies` → `builder` → `migrator` (one-shot `prisma migrate deploy`) → `runner` (the app). See the full working `Dockerfile` in this repo. Non-obvious points:

- **Bun image + node runtime**: build with bun (fast, cached installs), run the Next.js standalone output with `node server.js` (install `nodejs` in the runner stage).
- **Prisma 7 generates to `./generated/prisma`** (custom output in `schema.prisma`), NOT `node_modules/.prisma`. Copy it explicitly into the runner:
  ```dockerfile
  COPY --from=builder --chown=bun:bun /app/generated ./generated
  ```
  Copying `node_modules/.prisma` fails the build — that path no longer exists in Prisma 7.
- Build-time env vars (DATABASE_URL, AUTH_SECRET...) are **placeholders** so `next build` completes; real values come from the VPS `.env` at runtime.

### 3.2 .dockerignore — mandatory

Without it, the Docker build context ships `node_modules`, `.next`, and uploads: a **1.67 GB context** and 5-minute transfers per build. With it: ~10 MB.

```
node_modules
.next
.git
.env
.env.*
uploads
doc
scripts
*.md
*.tar
*.tgz
generated
app/generated
```

### 3.3 Next.js 16 route handlers — `params` is a Promise

```ts
// ❌ old (fails typecheck AND runtime)
export async function GET(req, { params }: { params: { id: string } }) {}

// ✅ Next 15/16
export async function GET(req, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

### 3.4 File-name case sensitivity

A file named `DockerFile` (capital F) builds fine on Windows but **fails on the Linux VPS** (`open Dockerfile: no such file`). Name it exactly `Dockerfile`.

### 3.5 docker-compose.prod.yml — the critical bits

```yaml
services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", 'pg_isready -U "$${POSTGRES_USER}" -d "$${POSTGRES_DB}"']
      interval: 10s
    networks: [edge]

  app:
    image: ${APP_IMAGE}
    restart: unless-stopped
    depends_on:
      postgres: { condition: service_healthy }
    env_file:
      - .env          # ← DO NOT FORGET. Without this you get 500s (see §7.3)
    environment:
      NODE_ENV: production
      PORT: 3000
      UPLOAD_DIR: /app/uploads
    volumes:
      - next_cache:/app/.next/cache
      - uploads_data:/app/uploads
    networks: [edge]

  migrate:
    image: ${MIGRATION_IMAGE}
    profiles: [ops]   # only runs when explicitly invoked
    depends_on:
      postgres: { condition: service_healthy }
    env_file: [.env]
    networks: [edge]

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports: ["80:80"]
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - uploads_data:/data/uploads:ro
    depends_on: [app]
    networks: [edge]

networks: { edge: {} }
volumes: { postgres_data: {}, next_cache: {}, uploads_data: {} }
```

`nginx.conf`:

```nginx
server {
    listen 80 default_server;
    server_name your-domain.ir www.your-domain.ir;

    location /uploads/ {
        alias /data/uploads/;    # served straight from disk, never through Node
    }
    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;   # CDN terminates TLS upstream
    }
}
```

### 3.6 Auth specifics (Auth.js v5 / NextAuth — same env vars work for better-auth)

- `AUTH_SECRET` must reach the container **at runtime** (via `env_file`). If it's missing you'll get 500s and `UntrustedHost: Host must be trusted` in the logs.
- `AUTH_TRUST_HOST=true` is required behind any proxy/CDN.
- better-auth additionally wants `BETTER_AUTH_URL=https://your-domain.ir` in the same `.env`.
- `NEXT_PUBLIC_*` values are **baked at build time** into client bundles — changing them requires a rebuild, not just an env update.

---

## 4. One-Time: GitHub CI/CD

### 4.1 Workflow (`.github/workflows/deploy.yml`)

Already in this repo — on every push to `main` it builds both targets and pushes to `ghcr.io`. Core shape:

```yaml
on: { push: { branches: [main] }, workflow_dispatch: {} }
env:
  IMAGE: ghcr.io/<owner-lowercase>/<repo-lowercase>   # MUST be lowercase!
jobs:
  build:
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: "${{ github.actor }}", password: "${{ secrets.GITHUB_TOKEN }}" }
      - uses: docker/build-push-action@v6
        with: { context: ., target: runner, push: true,
                tags: "${{ env.IMAGE }}:latest\n${{ env.IMAGE }}:${{ github.sha }}" }
      - uses: docker/build-push-action@v6
        with: { context: ., target: migrator, push: true,
                tags: "${{ env.IMAGE }}:migrate-latest" }
```

> **GHCR gotcha #1:** `${{ github.repository }}` yields your repo name **with capital letters** (`nextArtDev/kosar-localized`). ghcr.io rejects capitals → the push step fails with "invalid reference format". Hardcode the lowercase path or lowercase it in a step.
>
> **GHCR gotcha #2:** repo private → package is born **private** → anonymous `docker pull` from the VPS gets `denied`. Fix: your GitHub profile → Packages → *your-package* → Package settings → Danger Zone → **Change visibility → Public**. The repo stays private; only the compiled image is pullable. (Alternative: a `read:packages` PAT + `docker login ghcr.io` on the VPS.)

### 4.2 Optional: auto-deploy after build

The workflow file contains a commented-out `deploy:` job using `appleboy/ssh-action`. Enable it after adding repo secrets (**Settings → Secrets and variables → Actions**):

- `VPS_HOST` = your IP
- `VPS_USER` = ubuntu
- `VPS_SSH_KEY` = a private key whose public half is in the server's `authorized_keys` (a dedicated CI key, not your personal one)

---

## 5. Deploy Procedure (every release)

### 5.1 Normal flow (ghcr pull)

```powershell
# 1. Ship code
git add -A
git commit -m "..."
git push origin main        # triggers Actions; wait ~5 min for the green check

# 2. Release on the VPS
ssh -i C:\Users\<you>\.ssh\id_ed25519_deploy ubuntu@<VPS_IP>
```

```bash
cd /srv/<app>

# migrations only when prisma/schema changed
docker compose --env-file .env --env-file .deploy.env -f docker-compose.prod.yml run --rm migrate

# pull + release
for i in 1 2 3 4 5; do docker pull ghcr.io/<owner>/<repo>:latest && break; sleep 60; done   # ghcr flakes — retry!
docker tag ghcr.io/<owner>/<repo>:latest $(grep APP_IMAGE .deploy.env | cut -d= -f2)
docker tag ghcr.io/<owner>/<repo>:migrate-latest $(grep MIGRATION_IMAGE .deploy.env | cut -d= -f2)
docker compose --env-file .env --env-file .deploy.env -f docker-compose.prod.yml up -d app

# smoke test
sleep 10 && curl -so /dev/null -w "%{http_code}\n" http://127.0.0.1/
docker logs <app>-app-1 --tail 20
```

Pulls after the first are **small** — Docker fetches only changed layers — so the flaky ghcr route is fine in practice with retries.

### 5.2 When ghcr.io is having a bad day: GitHub Release seed

Verified working end-to-end on this project when ghcr was 50% TLS-timing-out:

**On your machine** (Docker Desktop running):

```powershell
docker build --target runner -t <app>:release .
docker save <app>:release -o release.tar
tar -czf release.tgz -C <dir> release.tar      # NOTE: this tgz CONTAINS release.tar

# create a release, then upload in ~19 MB chunks (big single uploads die at 408;
# chunks are individually retryable and resumable). See scripts in this repo's
# history or use upload_v2.ps1 pattern: list existing assets → skip → upload chunk
```

**On the VPS** (downloads from api.github.com — rock-solid from Iran):

```bash
TOKEN=$(cat /tmp/.ght)   # a GitHub token with repo read access, ASCII-only file!
# for each part id:
curl -sS -L -H "Authorization: Bearer $TOKEN" -H "Accept: application/octet-stream" \
  -o release.tgz.part$i -C - \
  "https://api.github.com/repos/<owner>/<repo>/releases/assets/<asset_id>"

cat release.tgz.part* > release.tgz
md5sum release.tgz                       # MUST match local md5
tar -xzf release.tgz                     # untar the OUTER wrapper → release.tar
docker load -i release.tar                # loads the inner OCI image
docker tag <app>:release $(grep APP_IMAGE .deploy.env | cut -d= -f2)
docker compose --env-file .env --env-file .deploy.env -f docker-compose.prod.yml up -d app
```

Three hard-won gotchas from this path:

1. **Double-wrap trap**: `docker load < release.tgz` says *unrecognized image format* — because release.tgz is a gzip of a tar *containing* release.tar. `tar -xzf` first, then `docker load -i release.tar`.
2. **PowerShell UTF-16 trap**: writing the token file with `Out-File` produces UTF-16 (null bytes) → GitHub answers "Bad credentials" JSON. Use `[System.IO.File]::WriteAllText($path, $token)`.
3. **Stale asset zombies**: interrupted uploads leave assets in `state=starter` that **block the name**. List assets via API, `DELETE` anything not `state=uploaded`, re-upload. Treat `already_exists` as success.

### 5.3 Emergency fallback: direct scp

```powershell
docker build --target runner -t <app>:vN .
docker save <app>:vN -o app.tar
scp -i C:\Users\<you>\.ssh\id_ed25519_deploy app.tar ubuntu@<VPS_IP>:/tmp/
ssh ... "docker load -i /tmp/app.tar && docker tag <app>:vN <app-tag-from-.deploy.env> && cd /srv/<app> && docker compose ... up -d app"
```

Expect ~250 KB/s user→VPS: fine for one image (~150 MB ≈ 10 min), painful for more.

### 5.4 Rollback

Before releasing, keep the previous image around:

```bash
docker tag $(grep APP_IMAGE .deploy.env | cut -d= -f2) <app>:rollback   # do this BEFORE pulling
# ...deploy new version, discover breakage...
docker tag <app>:rollback $(grep APP_IMAGE .deploy.env | cut -d= -f2)
docker compose --env-file .env --env-file .deploy.env -f docker-compose.prod.yml up -d app
```

---

## 6. Freeze Diagnosis — the Ferdowsi Playbook (§7 quick triage)

When the site (or SSH) dies again, run through this in order — it identifies which of the four known failure modes you're hitting.

```bash
uptime; free -h; df -h /                       # 1. resources right now
journalctl -k -b -1 --no-pager | tail -20       # 2. previous boot's last words
sudo dmesg -T | grep -iE "oom|killed process"  # 3. OOM kills this boot
docker ps; docker stats --no-stream            # 4. container state + memory
docker logs <app>-app-1 --tail 50              # 5. app errors
journalctl -u ssh -n 50 | grep -iE "throttling|reset|invalid"   # 6. sshd under attack?
```

**Failure modes seen in the wild on this exact stack:**

| Symptom | Evidence | Meaning | Fix |
|---|---|---|---|
| Whole VM freezes every few days, no OOM, no panic | prev-boot kernel log ends with `update_balloon_stats_func hogged CPU`, `clocksource: Long readout interval`, `RT throttling activated` | **Ferdowsi hypervisor memory-ballooning your starved VM** | Swap (§1.3) reduces frequency; real fix = upgrade plan / ticket to Ferdowsi |
| SSH resets while website works | `MaxStartups throttling` in sshd journal | brute-force flood saturating sshd | §1.4 hardening (kills password auth = flood becomes harmless) |
| VM freezes under load spikes | OOM kills in dmesg, no swap shown in `free -h` | 961 MB + no swap | §1.3 |
| App 500s after deploy, logs show `UntrustedHost` + `Cannot read properties of undefined` | container env lacks AUTH_* vars | `env_file: .env` missing from compose **on the server** (server/repo drift!) | add it, `up -d app` (§3.5) |
| Machine totally dead (SSH banner timeout + site down) | both fail | host-level stall | Ferdowsi dashboard reset is the only lever |

**Server/repo drift check** — before every release, diff what's actually on the box:

```bash
cd /srv/<app>
md5sum docker-compose.prod.yml nginx.conf .env   # compare against your records
docker compose --env-file .env --env-file .deploy.env -f docker-compose.prod.yml config | less
```

Bind-mount "hotfix" overrides (e.g. mounting a `route.ts` over the image's copy) feel clever but **silently shadow whatever you ship in the image** — remove them and keep the server running pure images.

---

## 7. Maintenance

### Backups (Postgres)

```bash
# nightly dump via cron
docker exec <app>-postgres-1 pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > /srv/<app>/backup-$(date +%F).sql.gz
```

Plus Ferdowsi snapshots from their dashboard. Test a restore at least once.

### Disk hygiene

```bash
docker system df                      # watch images/cache growth
docker image prune -f                 # dangling layers
docker builder prune -af              # after switching build strategies
```

### Logs

```bash
docker compose --env-file .env --env-file .deploy.env -f docker-compose.prod.yml logs -f app
```

---

## 8. Quick Reference Card

```powershell
# from your Windows machine
$ssh = "ssh -i C:\Users\<you>\.ssh\id_ed25519_deploy -o IdentitiesOnly=yes ubuntu@<VPS_IP>"

# deploy: push → wait green → release
git push origin main
iex "$ssh 'cd /srv/<app> && for i in 1 2 3 4 5; do docker pull ghcr.io/<owner>/<repo>:latest && break; sleep 60; done && docker tag ghcr.io/<owner>/<repo>:latest <app>:latest && docker compose --env-file .env --env-file .deploy.env -f docker-compose.prod.yml up -d app && sleep 10 && curl -so /dev/null -w %{http_code} http://127.0.0.1/'"
```

**Pre-deploy checklist:**
- [ ] `git status` clean, no `.tar`/secrets staged
- [ ] schema changed? → include the `run --rm migrate` step
- [ ] Actions run is green
- [ ] previous image tagged `:rollback`
- [ ] after release: `curl` 200 + `docker logs` clean + test the pages you changed

**Never do on this stack:**
- ❌ build Next.js on the VPS (freezes the machine)
- ❌ `apt-get` on the VPS for non-critical things (mirrors hang)
- ❌ commit tarballs/images/secrets
- ❌ trust `DockerFile` casing or missing `.dockerignore` to survive Linux builds
- ❌ edit app code via bind-mounts on the server — ship images instead
