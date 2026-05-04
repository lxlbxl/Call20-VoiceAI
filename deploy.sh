#!/bin/bash
# =============================================================================
# Call20 VoiceAI - Deploy to VPS
# =============================================================================
# This script deploys the app to a VPS using pre-built GHCR images.
# Run this script ON your VPS.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/lxlbxl/Call20-VoiceAI/main/deploy.sh | bash
#
# Or download and run:
#   wget https://raw.githubusercontent.com/lxlbxl/Call20-VoiceAI/main/deploy.sh
#   chmod +x deploy.sh
#   ./deploy.sh
# =============================================================================

set -e

# Configuration
GHCR_REGISTRY="ghcr.io"
GHCR_USERNAME="lxlbxl"
REPO_NAME="call20-voiceai"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/call20}"
ENV_FILE="${DEPLOY_DIR}/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &>/dev/null; then
        log_error "Docker is not installed. Installing..."
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker $USER
        log_warn "Please log out and back in, then run this script again."
        exit 1
    fi
    
    if ! command -v docker compose &>/dev/null && ! command -v docker-compose &>/dev/null; then
        log_error "Docker Compose is not installed."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create deployment directory
setup_directory() {
    log_info "Setting up deployment directory: ${DEPLOY_DIR}"
    sudo mkdir -p "${DEPLOY_DIR}"
    cd "${DEPLOY_DIR}"
    log_success "Directory ready"
}

# Create docker-compose.yaml
create_docker_compose() {
    log_info "Creating docker-compose.yaml..."
    
    cat > "${DEPLOY_DIR}/docker-compose.yaml" << 'COMPOSE_EOF'
version: "3.9"

services:
  # ── PostgreSQL ──────────────────────────────────────────────────────────────
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: call20
      POSTGRES_USER: call20
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-call20_dev}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U call20"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # ── Redis ───────────────────────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # ── Backend API ─────────────────────────────────────────────────────────────
  backend:
    image: ghcr.io/lxlbxl/call20-voiceai-backend:latest
    pull_policy: always
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://call20:${POSTGRES_PASSWORD:-call20_dev}@postgres:5432/call20
      REDIS_URL: redis://redis:6379
      SECRET_KEY: ${SECRET_KEY}
      DIDWW_API_KEY: ${DIDWW_API_KEY}
      DEEPGRAM_API_KEY: ${DEEPGRAM_API_KEY}
      CARTESIA_API_KEY: ${CARTESIA_API_KEY}
      GOOGLE_API_KEY: ${GOOGLE_API_KEY}
      FIRECRAWL_API_KEY: ${FIRECRAWL_API_KEY}
      FIRECRAWL_API_URL: ${FIRECRAWL_API_URL:-https://api.firecrawl.dev}
      CALL20_ADMIN_TOKEN: ${CALL20_ADMIN_TOKEN}
      DEBUG: ${DEBUG:-false}
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
    restart: unless-stopped

  # ── Voice Agent (Pipecat) ───────────────────────────────────────────────────
  voice-agent:
    image: ghcr.io/lxlbxl/call20-voiceai-voice-agent:latest
    pull_policy: always
    ports:
      - "8765:8765"
    environment:
      CALL20_API_URL: http://backend:8000/api/v1
      CALL20_ADMIN_TOKEN: ${CALL20_ADMIN_TOKEN}
      DEEPGRAM_API_KEY: ${DEEPGRAM_API_KEY}
      CARTESIA_API_KEY: ${CARTESIA_API_KEY}
      GOOGLE_API_KEY: ${GOOGLE_API_KEY}
      DIDWW_API_KEY: ${DIDWW_API_KEY}
      PUBLIC_HOST: ${PUBLIC_HOST:-localhost}
    depends_on:
      - backend
    restart: unless-stopped

  # ── SIP Gateway ─────────────────────────────────────────────────────────────
  sip-gateway:
    image: ghcr.io/lxlbxl/call20-voiceai-sip-gateway:latest
    pull_policy: always
    command: ["python", "sip_gateway.py"]
    ports:
      - "8766:8766"
    environment:
      CALL20_API_URL: http://backend:8000/api/v1
      VOICE_AGENT_URL: ws://voice-agent:8765/call
      CALL20_ADMIN_TOKEN: ${CALL20_ADMIN_TOKEN}
      DIDWW_API_KEY: ${DIDWW_API_KEY}
      PUBLIC_HOST: ${PUBLIC_HOST:-localhost}
      SIP_PORT: 8766
    depends_on:
      - voice-agent
    restart: unless-stopped

  # ── Frontend ────────────────────────────────────────────────────────────────
  frontend:
    image: ghcr.io/lxlbxl/call20-voiceai-frontend:latest
    pull_policy: always
    ports:
      - "3000:80"
    environment:
      VITE_API_URL: http://localhost:8000/api/v1
    depends_on:
      - backend
    restart: unless-stopped

  # ── Celery Worker ───────────────────────────────────────────────────────────
  celery:
    image: ghcr.io/lxlbxl/call20-voiceai-backend:latest
    pull_policy: always
    environment:
      DATABASE_URL: postgresql+asyncpg://call20:${POSTGRES_PASSWORD:-call20_dev}@postgres:5432/call20
      REDIS_URL: redis://redis:6379
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - postgres
      - redis
    command: celery -A app.core.celery worker --loglevel=info --concurrency=2
    restart: unless-stopped

  # ── Celery Beat (Scheduled Tasks) ───────────────────────────────────────────
  celery-beat:
    image: ghcr.io/lxlbxl/call20-voiceai-backend:latest
    pull_policy: always
    environment:
      DATABASE_URL: postgresql+asyncpg://call20:${POSTGRES_PASSWORD:-call20_dev}@postgres:5432/call20
      REDIS_URL: redis://redis:6379
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - postgres
      - redis
    command: celery -A app.core.celery beat --loglevel=info
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
COMPOSE_EOF

    log_success "docker-compose.yaml created"
}

# Create .env file template
create_env_file() {
    if [ -f "${ENV_FILE}" ]; then
        log_warn ".env file already exists. Skipping..."
        return
    fi
    
    log_info "Creating .env file template..."
    
    # Generate a random secret key
    SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || echo "change-me-$(date +%s)")
    
    cat > "${ENV_FILE}" << ENV_EOF
# =============================================================================
# Call20 VoiceAI - Environment Configuration
# =============================================================================

# Database
POSTGRES_PASSWORD=call20_dev_change_in_production

# Security
SECRET_KEY=${SECRET_KEY}
CALL20_ADMIN_TOKEN=$(openssl rand -hex 16 2>/dev/null || echo "admin-token-change-me")

# API Keys (add your actual keys here)
DIDWW_API_KEY=
DEEPGRAM_API_KEY=
CARTESIA_API_KEY=
GOOGLE_API_KEY=
FIRECRAWL_API_KEY=
FIRECRAWL_API_URL=https://api.firecrawl.dev

# Network
PUBLIC_HOST=localhost
DEBUG=false
ENV_EOF

    log_success ".env file created at ${ENV_FILE}"
    log_warn "Please edit ${ENV_FILE} and add your API keys!"
}

# Pull images
pull_images() {
    log_info "Pulling Docker images from GHCR..."
    
    cd "${DEPLOY_DIR}"
    
    if docker compose version &>/dev/null; then
        docker compose pull
    else
        docker-compose pull
    fi
    
    log_success "Images pulled"
}

# Start services
start_services() {
    log_info "Starting services..."
    
    cd "${DEPLOY_DIR}"
    
    if docker compose version &>/dev/null; then
        docker compose up -d
    else
        docker-compose up -d
    fi
    
    log_success "Services started!"
}

# Show status
show_status() {
    echo ""
    log_info "============================================"
    log_info "Call20 VoiceAI Deployment Status"
    log_info "============================================"
    echo ""
    
    cd "${DEPLOY_DIR}"
    
    if docker compose version &>/dev/null; then
        docker compose ps
    else
        docker-compose ps
    fi
    
    echo ""
    log_info "Service URLs:"
    log_info "  Frontend:  http://localhost:3000"
    log_info "  Backend:   http://localhost:8000"
    log_info "  API Docs:  http://localhost:8000/docs"
    log_info "  Voice:     ws://localhost:8765/call"
    log_info "  SIP:       localhost:8766"
    echo ""
    log_info "Useful commands:"
    log_info "  View logs:     cd ${DEPLOY_DIR} && docker compose logs -f"
    log_info "  Stop services: cd ${DEPLOY_DIR} && docker compose down"
    log_info "  Restart:       cd ${DEPLOY_DIR} && docker compose restart"
    echo ""
}

# Main
main() {
    echo ""
    log_info "============================================"
    log_info "Call20 VoiceAI - VPS Deployment"
    log_info "============================================"
    echo ""
    
    check_prerequisites
    setup_directory
    create_docker_compose
    create_env_file
    
    echo ""
    log_info "Pulling images (this may take a few minutes)..."
    pull_images
    
    start_services
    show_status
}

main "$@"