# Deployment Guide — Coolify & Docker

This guide provides step-by-step instructions for deploying Call20 to a production VPS using **Coolify**.

## 🏗️ Prerequisites

1. **VPS**: Ubuntu 22.04 LTS (Minimum 4GB RAM, 2 CPUs).
2. **Coolify Instance**: Installed via `wget -q https://get.coollabs.io/coolify/install.sh -O install.sh; sudo bash install.sh`.
3. **Domain**: Pointed to your VPS IP (e.g., `api.call20.ai`, `app.call20.ai`).
4. **API Keys**: Deepgram, Cartesia, Google Gemini, DIDWW.

---

## 🚀 Coolify Deployment Steps

### 1. Create a New Project
In your Coolify dashboard:
- Create a new **Project** named `Call20`.
- Create a new **Environment** named `Production`.

### 2. Add a Resource (Docker Compose)
- Click **+ New Resource** → **Docker Compose**.
- Select **GitHub Repository** as the source.
- Connect your GitHub account and select `lxlbxl/Call20-VoiceAI`.
- Select the `master` branch.

### 3. Configure Docker Compose
Coolify will automatically read your `docker-compose.yml`. You may need to tweak the following:
- Ensure the `frontend` service has a public FQDN (e.g., `https://app.call20.ai`).
- Ensure the `backend` service has a public FQDN (e.g., `https://api.call20.ai`).

### 4. Set Environment Variables
Navigate to the **Environment Variables** tab in Coolify and add all keys from `.env.example`:

| Key | Value |
| :--- | :--- |
| `DATABASE_URL` | `postgresql+asyncpg://call20:YOUR_PASSWORD@postgres:5432/call20` |
| `REDIS_URL` | `redis://redis:6379` |
| `SECRET_KEY` | `your_long_random_secret_key` |
| `CALL20_ADMIN_TOKEN` | `your_internal_admin_token` |
| `VITE_API_URL` | `https://api.call20.ai/api/v1` |
| `PUBLIC_HOST` | `api.call20.ai` |

> [!IMPORTANT]
> Make sure to change `POSTGRES_PASSWORD` from the default `call20_dev`.

### 5. Deploy
Click **Deploy**. Coolify will build the images and pull up the containers.

---

## 📡 SIP & Voice Configuration

For the **Voice Agent** and **SIP Gateway** to work correctly in production, you must:

1. **Firewall**: Open the following ports on your VPS (UFW/Cloud Security Group):
   - `80/443` (HTTP/HTTPS)
   - `8765` (Voice Agent WebSocket)
   - `8766` (SIP Gateway / UDP Audio)

2. **DIDWW Webhooks**:
   - Set your DIDWW Inbound Trunk destination to: `sip:YOUR_IP:8766`.
   - Update your Webhook URL in the DIDWW portal to: `https://api.call20.ai/api/v1/telephony/webhook`.

---

## 🛠️ Maintenance & Monitoring

- **Logs**: View real-time logs for any service in the Coolify "Logs" tab.
- **Migrations**: Database migrations run automatically on backend startup (`alembic upgrade head`).
- **Monitoring**: Access Prometheus metrics at `https://api.call20.ai/metrics`.
- **Health Checks**:
  - API Health: `https://api.call20.ai/health`
  - Frontend: `https://app.call20.ai`

---

## 🆘 Troubleshooting

- **Voice Latency**: Ensure your VPS is geographically close to your primary market (e.g., AWS Cape Town or a Lagos-based node).
- **CORS Errors**: Verify that `CORS_ORIGINS` in your environment variables includes your frontend URL.
- **WebSocket Connection Failed**: Check if your reverse proxy (Coolify uses Traefik by default) is configured to allow WebSocket headers (`Upgrade`, `Connection`).

For further help, refer to the [Internal PRD](Call20_PRD_v7.md).
