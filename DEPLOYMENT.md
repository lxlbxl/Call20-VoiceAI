# Deployment Guide — Coolify & Docker

This guide provides step-by-step instructions for deploying Call20 to a production VPS using **Coolify**.

---

## 🏗️ Prerequisites

### 1. VPS Requirements
- **OS**: Ubuntu 22.04 LTS (or Debian 12)
- **RAM**: Minimum 4GB (8GB recommended for voice workloads)
- **CPU**: 2+ cores
- **Disk**: 40GB+ SSD
- **Network**: Public IP with ports 80, 443, 8765, 8766 open

### 2. Domain Setup
Point your domains to the VPS IP:
- `app.call20.ai` → Frontend
- `api.call20.ai` → Backend API

### 3. API Keys (Required)
| Service | Key | Purpose |
|---------|-----|---------|
| Deepgram | `DEEPGRAM_API_KEY` | Speech-to-Text |
| Cartesia | `CARTESIA_API_KEY` | Text-to-Speech |
| Google | `GOOGLE_API_KEY` | Gemini LLM |
| DIDWW | `DIDWW_API_KEY` | Phone number provisioning |
| Firecrawl | `FIRECRAWL_API_KEY` | Web scraping for knowledge base |

---

## 📦 Step 1: Install Coolify on Your VPS

SSH into your VPS and run:

```bash
# Download and run the Coolify installer
wget -q https://get.coollabs.io/coolify/install.sh -O install.sh
sudo bash install.sh
```

The installer will:
- Install Docker and Docker Compose
- Set up Coolify with a reverse proxy (Traefik)
- Provide you with an initial setup URL and registration link

**Important**: Note the registration URL shown at the end of the installation. You'll use it to create your admin account.

### Access Coolify Dashboard
Open `http://YOUR_VPS_IP:8000` in your browser and complete the initial setup:
1. Create your admin account
2. Configure your timezone
3. Skip the "Connect Cloudflare" step (optional)

---

## 🔑 Step 2: Connect GitHub to Coolify

1. In the Coolify dashboard, go to **Sources** (left sidebar)
2. Click **+ New Source**
3. Select **GitHub**
4. Choose **Public Repository** (since `lxlbxl/Call20-VoiceAI` is public)
5. Enter the repository URL: `https://github.com/lxlbxl/Call20-VoiceAI`
6. Click **Connect**

> **Note**: The repository branch is `master` (not `main`).

---

## 🚀 Step 3: Create the Deployment Resource

### 3.1 Create Project & Environment
1. Go to **Projects** → Click **+ New Project**
2. Name it `Call20`
3. Inside the project, click **+ New Environment** → Name it `Production`

### 3.2 Add Docker Compose Resource
1. In the `Production` environment, click **+ New Resource**
2. Select **Docker Compose** (also called "Service" in some Coolify versions)
3. Configure the source:
   - **Repository**: `lxlbxl/Call20-VoiceAI`
   - **Branch**: `master` ← **Important: Use `master`, not `main`**
   - **Docker Compose Location**: `/docker-compose.yaml` (default)

### 3.3 Critical: Disable Nixpacks / Enable Docker Compose
Coolify may try to auto-detect the build type. You must ensure it uses **Docker Compose**:

1. In the resource settings, find **Build Pack** or **Build Type**
2. Set it to **Docker Compose** (NOT Nixpacks, NOT Dockerfile)
3. If you see a "Static" or "Nixpacks" option, change it to **Docker Compose**

> **Why?** Coolify's Nixpacks auto-detection will try to build the project as a Node.js/Python app instead of using our pre-configured Docker Compose stack.

### 3.4 Configure Pull Pre-Built Images (Recommended)

The CI/CD pipeline pre-builds all images to GitHub Container Registry (GHCR). To use pre-built images instead of building on your VPS:

1. In the resource settings, find **Custom Docker Compose** or **Override Docker Compose**
2. Replace the `build:` sections with `image:` directives:

```yaml
version: "3.9"

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: call20
      POSTGRES_USER: call20
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U call20"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: ghcr.io/lxlbxl/call20-voiceai/backend:latest
    environment:
      DATABASE_URL: postgresql+asyncpg://call20:${POSTGRES_PASSWORD}@postgres:5432/call20
      REDIS_URL: redis://redis:6379
      SECRET_KEY: ${SECRET_KEY}
      DIDWW_API_KEY: ${DIDWW_API_KEY}
      DEEPGRAM_API_KEY: ${DEEPGRAM_API_KEY}
      CARTESIA_API_KEY: ${CARTESIA_API_KEY}
      GOOGLE_API_KEY: ${GOOGLE_API_KEY}
      FIRECRAWL_API_KEY: ${FIRECRAWL_API_KEY}
      CALL20_ADMIN_TOKEN: ${CALL20_ADMIN_TOKEN}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: >
      sh -c "
        alembic upgrade head &&
        uvicorn app.main:app --host 0.0.0.0 --port 8000
      "

  voice-agent:
    image: ghcr.io/lxlbxl/call20-voiceai/voice-agent:latest
    environment:
      CALL20_API_URL: http://backend:8000/api/v1
      CALL20_ADMIN_TOKEN: ${CALL20_ADMIN_TOKEN}
      DEEPGRAM_API_KEY: ${DEEPGRAM_API_KEY}
      CARTESIA_API_KEY: ${CARTESIA_API_KEY}
      GOOGLE_API_KEY: ${GOOGLE_API_KEY}
      DIDWW_API_KEY: ${DIDWW_API_KEY}
      PUBLIC_HOST: ${PUBLIC_HOST}
    depends_on:
      - backend

  sip-gateway:
    image: ghcr.io/lxlbxl/call20-voiceai/sip-gateway:latest
    command: ["python", "sip_gateway.py"]
    environment:
      CALL20_API_URL: http://backend:8000/api/v1
      VOICE_AGENT_URL: ws://voice-agent:8765/call
      CALL20_ADMIN_TOKEN: ${CALL20_ADMIN_TOKEN}
      DIDWW_API_KEY: ${DIDWW_API_KEY}
      PUBLIC_HOST: ${PUBLIC_HOST}
      SIP_PORT: 8766
    depends_on:
      - voice-agent

  frontend:
    image: ghcr.io/lxlbxl/call20-voiceai/frontend:latest
    environment:
      VITE_API_URL: https://${API_HOST}/api/v1
    depends_on:
      - backend

  celery:
    image: ghcr.io/lxlbxl/call20-voiceai/backend:latest
    environment:
      DATABASE_URL: postgresql+asyncpg://call20:${POSTGRES_PASSWORD}@postgres:5432/call20
      REDIS_URL: redis://redis:6379
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - postgres
      - redis
    command: celery -A app.core.celery worker --loglevel=info --concurrency=4

  celery-beat:
    image: ghcr.io/lxlbxl/call20-voiceai/backend:latest
    environment:
      DATABASE_URL: postgresql+asyncpg://call20:${POSTGRES_PASSWORD}@postgres:5432/call20
      REDIS_URL: redis://redis:6379
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - postgres
      - redis
    command: celery -A app.core.celery beat --loglevel=info

volumes:
  postgres_data:
  redis_data:
```

> **Alternative**: If you prefer to build on your VPS, keep the original `docker-compose.yaml` with `build:` directives. This takes longer but doesn't require GHCR access.

---

## 🔐 Step 4: Set Environment Variables

In Coolify, navigate to the **Environment Variables** tab for your resource and add the following:

| Variable | Value | Description |
|----------|-------|-------------|
| `POSTGRES_PASSWORD` | `aStrongRandomPassword123!` | PostgreSQL password (change from default) |
| `SECRET_KEY` | `your-32-char-min-random-string` | Django/FastAPI secret key |
| `CALL20_ADMIN_TOKEN` | `your-admin-token-here` | Internal admin authentication |
| `DEEPGRAM_API_KEY` | `dg.xxxxx` | Deepgram API key |
| `CARTESIA_API_KEY` | `cartesia_xxxxx` | Cartesia API key |
| `GOOGLE_API_KEY` | `AIzaSyxxxxx` | Google Gemini API key |
| `DIDWW_API_KEY` | `didww_xxxxx` | DIDWW API key |
| `FIRECRAWL_API_KEY` | `fc_xxxxx` | Firecrawl API key (optional) |
| `PUBLIC_HOST` | `api.call20.ai` | Your API domain (no https://) |
| `API_HOST` | `api.call20.ai` | Your API domain (for frontend) |

### Generating Secure Keys

```bash
# Generate SECRET_KEY (Python)
python3 -c "import secrets; print(secrets.token_urlsafe(48))"

# Generate CALL20_ADMIN_TOKEN
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 🌐 Step 5: Configure Domains & Ports

### 5.1 Set Public Domains (FQDNs)

In Coolify, for each service that needs public access:

**Frontend Service:**
- Set **FQDN** (Fully Qualified Domain Name) to: `https://app.call20.ai`
- Coolify will automatically provision an SSL certificate via Let's Encrypt

**Backend Service:**
- Set **FQDN** to: `https://api.call20.ai`
- Coolify will automatically provision an SSL certificate

### 5.2 Open Ports for Voice Traffic

The Voice Agent and SIP Gateway need direct TCP/UDP access. In Coolify:

1. **Voice Agent** service:
   - Map port: `8765:8765` (WebSocket for voice)
   - Ensure the port is exposed (not just internal)

2. **SIP Gateway** service:
   - Map port: `8766:8766` (SIP/UDP audio)
   - Ensure the port is exposed

### 5.3 Configure VPS Firewall

On your VPS, open the required ports:

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8765/tcp
sudo ufw allow 8766/udp
sudo ufw reload

# Or iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8765 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 8766 -j ACCEPT
```

> **Cloud Providers**: Also open these ports in your cloud security group (AWS, DigitalOcean, etc.)

---

## 🚀 Step 6: Deploy

1. Click the **Deploy** button in Coolify
2. Watch the logs in real-time
3. Wait for all services to show a green ✓ status

### Expected Deployment Flow
```
1. Coolify pulls docker-compose.yaml from GitHub (master branch)
2. Pulls pre-built images from GHCR (or builds if using build:)
3. Starts postgres and redis with health checks
4. Runs alembic migrations on backend startup
5. Starts backend, voice-agent, sip-gateway, frontend, celery
6. Configures Traefik reverse proxy with SSL certificates
7. Services are live!
```

---

## 📡 Step 7: Configure Telephony (DIDWW)

### 7.1 Set Up Inbound Trunk
In the DIDWW portal:
1. Go to **Trunks** → Create or edit your trunk
2. Set the **Destination** to: `sip:YOUR_VPS_IP:8766`
3. Set **Transport** to: UDP

### 7.2 Configure Webhooks
In the DIDWW portal:
1. Go to **Webhooks** → Create new webhook
2. Set URL to: `https://api.call20.ai/api/v1/telephony/webhook`
3. Select events: `call.started`, `call.ended`, `call.failed`

---

## ✅ Step 8: Verify Deployment

### Health Checks
```bash
# Backend API health
curl https://api.call20.ai/health

# Frontend
curl -I https://app.call20.ai

# Voice Agent WebSocket (should return 101 Switching Protocols)
wscat -c wss://api.call20.ai:8765/call
```

### Access the Dashboard
- **Frontend**: `https://app.call20.ai`
- **API Docs**: `https://api.call20.ai/docs` (Swagger UI)
- **Admin Panel**: `https://app.call20.ai/admin`

---

## 🛠️ Maintenance & Monitoring

### View Logs
In Coolify:
1. Go to your resource
2. Click on any service
3. Click the **Logs** tab to view real-time logs

### Database Migrations
Migrations run automatically on backend startup. To run manually:
```bash
# Via Coolify exec
docker exec call20-backend-1 alembic upgrade head
```

### Update to Latest Version
1. Push changes to the `master` branch on GitHub
2. GitHub Actions automatically builds and pushes new images to GHCR
3. In Coolify, click **Deploy** → **Pull Latest Images** → **Deploy**

### Backup PostgreSQL
```bash
# Backup
docker exec call20-postgres-1 pg_dump -U call20 call20 > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i call20-postgres-1 psql -U call20 call20 < backup_20260505.sql
```

---

## 🆘 Troubleshooting

### ❌ "Remote branch main not found" Error
**Cause**: Coolify is trying to clone the `main` branch, but the repo uses `master`.
**Fix**: In the resource settings, change the branch from `main` to `master`.

### ❌ Nixpacks Build Failure
**Cause**: Coolify auto-detected Nixpacks instead of Docker Compose.
**Fix**: In resource settings, change **Build Pack** to **Docker Compose**.

### ❌ Frontend Shows Blank Page
**Cause**: `VITE_API_URL` is not set correctly.
**Fix**: Set `VITE_API_URL=https://api.call20.ai/api/v1` in environment variables, then redeploy.

### ❌ Voice Connection Fails
**Cause**: Ports 8765/8766 not open or WebSocket not configured.
**Fix**:
1. Check firewall: `sudo ufw status`
2. Verify Coolify port mapping for voice-agent and sip-gateway
3. Ensure Traefik allows WebSocket upgrades (Coolify does this by default)

### ❌ CORS Errors
**Cause**: Frontend URL not in backend's allowed origins.
**Fix**: Set `CORS_ORIGINS=https://app.call20.ai` in environment variables.

### ❌ Database Connection Refused
**Cause**: PostgreSQL not ready when backend starts.
**Fix**: The health check in `docker-compose.yaml` handles this. If still failing, check:
```bash
docker exec call20-postgres-1 pg_isready -U call20
```

### ❌ GHCR Image Pull Access Denied
**Cause**: GHCR images are private.
**Fix**: Either make the repo public, or add GHCR credentials in Coolify:
1. Go to **Registries** in Coolify
2. Add a new registry: `ghcr.io`
3. Username: your GitHub username
4. Password: a GitHub Personal Access Token with `read:packages` scope

---

## 📊 Architecture Overview

```
                    ┌─────────────────────────────────────────────┐
                    │                  VPS / Coolify               │
                    │                                              │
  Internet          │  ┌──────────┐    ┌──────────┐              │
  ──────► 80/443 ──► │ Traefik  │───►│ Frontend │ :3000 (Nginx) │
  (HTTPS)           │  │(Reverse  │───│  (React) │              │
                    │  │ Proxy)   │───│          │              │
                    │  │          │───┴──────────┘              │
                    │  │          │    ┌──────────┐              │
                    │  │          │───│ Backend  │ :8000 (FastAPI)
                    │  │          │───│  (API)   │              │
                    │  └──────────┘   └────┬─────┘              │
                    │                      │                     │
                    │              ┌───────┴───────┐            │
                    │              │               │            │
                    │        ┌─────┴─────┐  ┌─────┴─────┐      │
                    │        │ Voice     │  │ SIP       │      │
                    │        │ Agent     │  │ Gateway   │      │
                    │        │ :8765     │  │ :8766     │      │
                    │        │ (WS)      │  │ (SIP/UDP) │      │
                    │        └───────────┘  └───────────┘      │
                    │                                              │
                    │  ┌──────────┐    ┌──────────┐              │
                    │  │PostgreSQL│    │  Redis   │              │
                    │  │  :5432   │    │  :6379   │              │
                    │  │(pgvector)│    │          │              │
                    │  └──────────┘    └──────────┘              │
                    │                                              │
                    │  ┌──────────┐    ┌──────────┐              │
                    │  │ Celery   │    │ Celery   │              │
                    │  │ Worker   │    │  Beat    │              │
                    │  └──────────┘    └──────────┘              │
                    └─────────────────────────────────────────────┘
```

---

## 📞 Support

For deployment assistance or enterprise licensing, contact [support@call20.ai](mailto:support@call20.ai).

For internal documentation, see [Call20_PRD_v7.md](Call20_PRD_v7.md).