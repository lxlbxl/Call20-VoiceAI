#!/bin/bash
# =============================================================================
# Call20 VoiceAI - Build and Push to GitHub Container Registry (GHCR)
# =============================================================================
# Usage:
#   ./build-and-push.sh           # Build and push all images
#   ./build-and-push.sh backend   # Build and push only backend
#   ./build-and-push.sh voice     # Build and push only voice-agent
#   ./build-and-push.sh sip       # Build and push only sip-gateway
#   ./build-and-push.sh frontend  # Build and push only frontend
#   ./build-and-push.sh all       # Build and push all images
# =============================================================================

set -e

# Configuration
GHCR_REGISTRY="ghcr.io"
GHCR_USERNAME="lxlbxl"
REPO_NAME="call20-voiceai"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info &>/dev/null; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Login to GHCR
login_to_ghcr() {
    log_info "Logging in to GitHub Container Registry..."
    
    if [ -z "$GHCR_TOKEN" ]; then
        log_warn "GHCR_TOKEN not set. Attempting docker login..."
        log_info "You can set GHCR_TOKEN environment variable for non-interactive login."
        docker login ghcr.io -u "$GHCR_USERNAME"
    else
        echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
    fi
    
    log_success "Logged in to GHCR"
}

# Build a single image
build_image() {
    local service_name=$1
    local dockerfile=$2
    local context=${3:-.}
    local image_name="${GHCR_REGISTRY}/${GHCR_USERNAME}/${REPO_NAME}-${service_name}"
    
    log_info "Building ${service_name}..."
    log_info "  Dockerfile: ${dockerfile}"
    log_info "  Context: ${context}"
    log_info "  Image: ${image_name}:${IMAGE_TAG}"
    
    docker build \
        -f "$dockerfile" \
        -t "${image_name}:${IMAGE_TAG}" \
        --progress=plain \
        "$context"
    
    log_success "Built ${service_name} successfully"
}

# Push an image to GHCR
push_image() {
    local service_name=$1
    local image_name="${GHCR_REGISTRY}/${GHCR_USERNAME}/${REPO_NAME}-${service_name}"
    
    log_info "Pushing ${service_name} to GHCR..."
    docker push "${image_name}:${IMAGE_TAG}"
    log_success "Pushed ${service_name} to GHCR"
    
    echo ""
    log_info "Image URL: ${image_name}:${IMAGE_TAG}"
}

# Build and push a service
build_and_push() {
    local service_name=$1
    local dockerfile=$2
    local context=${3:-.}
    
    build_image "$service_name" "$dockerfile" "$context"
    push_image "$service_name"
}

# Build all images
build_all() {
    log_info "============================================"
    log_info "Building all Call20 VoiceAI images"
    log_info "Registry: ${GHCR_REGISTRY}/${GHCR_USERNAME}/${REPO_NAME}"
    log_info "Tag: ${IMAGE_TAG}"
    log_info "============================================"
    echo ""
    
    # Backend (used by backend, celery, celery-beat)
    build_and_push "backend" "Dockerfile.backend" "."
    
    # Voice Agent (Pipecat)
    build_and_push "voice-agent" "Dockerfile.pipecat" "."
    
    # SIP Gateway (uses same Dockerfile as voice-agent)
    build_and_push "sip-gateway" "Dockerfile.pipecat" "."
    
    # Frontend
    build_and_push "frontend" "frontend/Dockerfile" "frontend"
    
    log_info "============================================"
    log_success "All images built and pushed!"
    log_info "============================================"
    echo ""
    log_info "Update your docker-compose.yaml to use these images:"
    echo ""
    echo "  backend:    image: ${GHCR_REGISTRY}/${GHCR_USERNAME}/${REPO_NAME}-backend:${IMAGE_TAG}"
    echo "  voice-agent: image: ${GHCR_REGISTRY}/${GHCR_USERNAME}/${REPO_NAME}-voice-agent:${IMAGE_TAG}"
    echo "  sip-gateway: image: ${GHCR_REGISTRY}/${GHCR_USERNAME}/${REPO_NAME}-sip-gateway:${IMAGE_TAG}"
    echo "  frontend:   image: ${GHCR_REGISTRY}/${GHCR_USERNAME}/${REPO_NAME}-frontend:${IMAGE_TAG}"
    echo ""
}

# Show usage
show_usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  all (default)  - Build and push all images"
    echo "  backend        - Build and push backend image"
    echo "  voice          - Build and push voice-agent image"
    echo "  sip            - Build and push sip-gateway image"
    echo "  frontend       - Build and push frontend image"
    echo "  help           - Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  IMAGE_TAG      - Image tag (default: latest)"
    echo "  GHCR_TOKEN     - GitHub personal access token (optional)"
    echo ""
    echo "Examples:"
    echo "  $0                          # Build and push all images"
    echo "  $0 backend                  # Build and push backend only"
    echo "  IMAGE_TAG=v1.0 $0           # Tag images as v1.0"
    echo "  GHCR_TOKEN=xxx $0           # Non-interactive login"
}

# Main
main() {
    local command=${1:-all}
    
    check_docker
    
    case "$command" in
        all)
            login_to_ghcr
            build_all
            ;;
        backend)
            login_to_ghcr
            build_and_push "backend" "Dockerfile.backend" "."
            ;;
        voice)
            login_to_ghcr
            build_and_push "voice-agent" "Dockerfile.pipecat" "."
            ;;
        sip)
            login_to_ghcr
            build_and_push "sip-gateway" "Dockerfile.pipecat" "."
            ;;
        frontend)
            login_to_ghcr
            build_and_push "frontend" "frontend/Dockerfile" "frontend"
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"