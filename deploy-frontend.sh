#!/bin/bash

# Darch Frontend Deployment Script
# This script builds and deploys the Darch frontend application using Docker

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="darch-frontend"
CONTAINER_NAME="darch-frontend-container"
PORT=3000
BUILD_CONTEXT="."

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup_container() {
    log_info "Checking for existing container..."
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_warning "Stopping and removing existing container: ${CONTAINER_NAME}"
        docker stop ${CONTAINER_NAME} 2>/dev/null || true
        docker rm ${CONTAINER_NAME} 2>/dev/null || true
        log_success "Container cleaned up"
    else
        log_info "No existing container found"
    fi
}

build_image() {
    log_info "Building Docker image: ${IMAGE_NAME}"
    if docker build -t ${IMAGE_NAME} ${BUILD_CONTEXT}; then
        log_success "Docker image built successfully"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi
}

run_container() {
    log_info "Starting container: ${CONTAINER_NAME}"
    if docker run -d \
        --name ${CONTAINER_NAME} \
        -p ${PORT}:3000 \
        --restart unless-stopped \
        ${IMAGE_NAME}; then
        log_success "Container started successfully"
        log_info "Application is available at: http://localhost:${PORT}"
    else
        log_error "Failed to start container"
        exit 1
    fi
}

check_health() {
    log_info "Checking application health..."
    sleep 5  # Give the app time to start
    
    for i in {1..30}; do
        if curl -f -s http://localhost:${PORT} > /dev/null; then
            log_success "Application is healthy and responding"
            return 0
        fi
        log_info "Waiting for application to start... (${i}/30)"
        sleep 2
    done
    
    log_error "Application failed to start or is not responding"
    docker logs ${CONTAINER_NAME}
    exit 1
}

show_status() {
    log_info "Deployment Status:"
    echo "======================================"
    echo "Container Name: ${CONTAINER_NAME}"
    echo "Image: ${IMAGE_NAME}"
    echo "Port: ${PORT}"
    echo "URL: http://localhost:${PORT}"
    echo "======================================"
    
    log_info "Container Status:"
    docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Main deployment flow
main() {
    log_info "Starting Darch Frontend Deployment"
    echo "======================================"
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Parse command line arguments
    case "${1:-deploy}" in
        "build")
            log_info "Building image only..."
            build_image
            ;;
        "deploy")
            log_info "Full deployment (build + run)..."
            cleanup_container
            build_image
            run_container
            check_health
            show_status
            ;;
        "start")
            log_info "Starting existing container..."
            if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
                docker start ${CONTAINER_NAME}
                check_health
                show_status
            else
                log_error "Container ${CONTAINER_NAME} does not exist. Run './deploy.sh deploy' first."
                exit 1
            fi
            ;;
        "stop")
            log_info "Stopping container..."
            docker stop ${CONTAINER_NAME} 2>/dev/null || true
            log_success "Container stopped"
            ;;
        "restart")
            log_info "Restarting container..."
            docker restart ${CONTAINER_NAME}
            check_health
            show_status
            ;;
        "logs")
            log_info "Showing container logs..."
            docker logs -f ${CONTAINER_NAME}
            ;;
        "clean")
            log_info "Cleaning up..."
            cleanup_container
            docker rmi ${IMAGE_NAME} 2>/dev/null || true
            log_success "Cleanup complete"
            ;;
        "status")
            show_status
            ;;
        *)
            echo "Usage: $0 {build|deploy|start|stop|restart|logs|clean|status}"
            echo ""
            echo "Commands:"
            echo "  build   - Build Docker image only"
            echo "  deploy  - Full deployment (build + run) [default]"
            echo "  start   - Start existing container"
            echo "  stop    - Stop running container"
            echo "  restart - Restart container"
            echo "  logs    - Show container logs"
            echo "  clean   - Remove container and image"
            echo "  status  - Show deployment status"
            exit 1
            ;;
    esac
    
    log_success "Operation completed successfully!"
}

# Run the main function with all arguments
main "$@"
