# Call20 — AI-Powered Voice Agent Platform for African SMEs

[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Pipecat](https://img.shields.io/badge/Pipecat-AI-blue?style=for-the-badge)](https://www.pipecat.ai/)
[![Deployed on Coolify](https://img.shields.io/badge/Deployed%20on-Coolify-4F46E5?style=for-the-badge&logo=docker)](https://coolify.io/)

Call20 is a robust, multi-tenant voice AI platform designed specifically for the African market. It enables businesses to deploy AI voice agents that can handle inbound customer support, outbound sales, and automated appointment scheduling with localized accents and low-latency response times.

---

## 🚀 Key Features

- **Local Accents**: Optimized for Deepgram Nova-2 with `en-NG`, `en-KE`, and `en-ZA` models.
- **Bi-Directional Voice**: Low-latency, full-duplex conversations using Pipecat and WebSocket transports.
- **Multi-Tenant Architecture**: Complete workspace isolation with Role-Based Access Control (RBAC).
- **DID Provisioning**: Automated African phone number (NG, KE, GH, ZA) procurement via DIDWW integration.
- **Knowledge Base (RAG)**: Ingest websites and documents into a Postgres + pgvector store for context-aware AI.
- **Prepaid Wallet**: USD/NGN billing with real-time deduction, free trial credits, and promotional coupons.
- **Analytics & Webhooks**: Real-time call logs, sentiment analysis, and event-driven automation.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI (Python 3.11), SQLAlchemy, Alembic |
| **Voice Pipeline** | Pipecat AI, Deepgram (STT), Cartesia/ElevenLabs (TTS), Gemini 1.5 Flash (LLM) |
| **Database** | PostgreSQL 16 (pgvector), Redis 7 |
| **Frontend** | React (Vite), Tailwind CSS, TanStack Query |
| **Infrastructure** | Docker, Docker Compose, Celery (Background Tasks) |
| **Deployment** | Coolify (self-hosted PaaS), GitHub Actions (CI/CD) |

---

## 🚦 Quick Start (Local Development)

### 1. Clone & Setup
```bash
git clone https://github.com/lxlbxl/Call20-VoiceAI.git
cd Call20-VoiceAI
cp .env.example .env
```

### 2. Configure Environment
Edit the `.env` file with your API keys:
- `DEEPGRAM_API_KEY` (STT)
- `CARTESIA_API_KEY` (TTS)
- `GOOGLE_API_KEY` (Gemini LLM)
- `DIDWW_API_KEY` (Telephony)

### 3. Launch Stack
```bash
docker compose up --build
```

Access the dashboard at [http://localhost:3000](http://localhost:3000).

---

## 📁 Project Structure

```
Call20-VoiceAI/
├── backend/              # FastAPI backend (Python)
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── models/       # SQLAlchemy models
│   │   ├── services/     # Business logic
│   │   └── tasks/        # Celery tasks
│   └── migrations/       # Alembic migrations
├── frontend/             # React dashboard (Vite)
│   ├── src/
│   │   ├── client/       # API client
│   │   ├── pages/        # Page components
│   │   └── components/   # Shared components
│   └── Dockerfile
├── pipecat/              # Voice pipeline (Pipecat AI)
│   ├── voice_agent.py    # Main voice agent
│   ├── sip_gateway.py    # SIP trunk handler
│   └── tools.py          # Pipecat tools
├── docker-compose.yaml   # Docker Compose orchestration
├── Dockerfile.backend    # Backend container
├── Dockerfile.pipecat    # Voice agent container
└── .github/workflows/    # CI/CD pipeline
```

---

## 🌐 Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the complete step-by-step guide to deploy on Coolify.

### Quick Deploy (Coolify)

1. **Prerequisites**: Ubuntu 22.04 VPS (4GB+ RAM), Coolify installed, domain pointed to VPS.
2. **Add Resource**: In Coolify → **+ New Resource** → **Docker Compose** → Select `lxlbxl/Call20-VoiceAI` repo → Branch: `master`.
3. **Set Environment Variables**: Copy all keys from `.env.example` into Coolify's Environment Variables tab.
4. **Deploy**: Click **Deploy**. Coolify will pull pre-built images from GitHub Container Registry and start all services.

### Pre-Built Docker Images

All services are pre-built via GitHub Actions and pushed to GHCR:
- `ghcr.io/lxlbxl/call20-voiceai/backend:latest`
- `ghcr.io/lxlbxl/call20-voiceai/frontend:latest`
- `ghcr.io/lxlbxl/call20-voiceai/voice-agent:latest`
- `ghcr.io/lxlbxl/call20-voiceai/sip-gateway:latest`

---

## 📄 License

This project is proprietary and confidential.

## 📞 Support

For deployment assistance or enterprise licensing, contact [support@call20.ai](mailto:support@call20.ai).