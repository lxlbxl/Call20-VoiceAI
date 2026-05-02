# Call20 — AI-Powered Voice Agent Platform for African SMEs

[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Pipecat](https://img.shields.io/badge/Pipecat-AI-blue?style=for-the-badge)](https://www.pipecat.ai/)

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

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python 3.11), SQLAlchemy, Alembic.
- **Voice Pipeline**: Pipecat AI, Deepgram (STT), Cartesia/ElevenLabs (TTS), Gemini 1.5 Flash (LLM).
- **Database**: PostgreSQL 16 (pgvector), Redis 7.
- **Frontend**: React (Vite), Tailwind CSS, TanStack Query.
- **Infrastructure**: Docker, Docker Compose, Celery (Background Tasks).

---

## 🚦 Quick Start (Local)

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

- `/backend`: FastAPI source code and database migrations.
- `/frontend`: React dashboard and admin suite.
- `/pipecat`: Core voice pipeline logic and SIP gateway.
- `/docker-compose.yml`: Main orchestration file for production-ready deployment.

## 📄 License

This project is proprietary and confidential.

## 📞 Support

For deployment assistance or enterprise licensing, contact [support@call20.ai](mailto:support@call20.ai).
