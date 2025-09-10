#!/bin/bash
# Production deployment script using Docker

set -e

echo "🚀 Starting Darch Backend deployment..."

# Configuration
IMAGE_NAME="darch-backend"
CONTAINER_NAME="darch-backend-api"
PORT="5000"
OUTPUT_DIR="$(pwd)/src/output"

# Ensure output directory exists with proper permissions
mkdir -p "$OUTPUT_DIR"
chmod 755 "$OUTPUT_DIR"

# Build the production image
echo "📦 Building production Docker image..."
docker build -t $IMAGE_NAME .

# Stop and remove existing container if it exists
echo "🛑 Stopping existing container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Start the production container
echo "🏃 Starting production container..."
docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:5000 \
  -v "$OUTPUT_DIR:/app/src/output:rw" \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e API_HOST=0.0.0.0 \
  --restart unless-stopped \
  --user root \
  $IMAGE_NAME

# Fix permissions inside container
echo "🔧 Fixing output directory permissions..."
docker exec $CONTAINER_NAME chown -R darch:nodejs /app/src/output
docker exec $CONTAINER_NAME chmod -R 755 /app/src/output

# Wait for service to be healthy
echo "⏳ Waiting for service to be healthy..."
timeout=60
elapsed=0

while [ $elapsed -lt $timeout ]; do
    if docker exec $CONTAINER_NAME ./docker-healthcheck.sh > /dev/null 2>&1; then
        echo "✅ Service is healthy!"
        break
    fi
    
    echo "⏱️  Waiting for service to start... ($elapsed/$timeout seconds)"
    sleep 5
    elapsed=$((elapsed + 5))
done

if [ $elapsed -ge $timeout ]; then
    echo "❌ Service failed to start within $timeout seconds"
    docker logs $CONTAINER_NAME
    exit 1
fi

# Show service status
echo "📊 Container status:"
docker ps | grep $CONTAINER_NAME

echo "🎉 Deployment completed successfully!"
echo "🌐 API is available at: http://localhost:$PORT"
echo "🏥 Health check: http://localhost:$PORT/health"
echo "📋 API endpoint: http://localhost:$PORT/api/generate-terraform"
echo "📁 Output directory: $OUTPUT_DIR"
echo ""
echo "📋 Useful commands:"
echo "  docker logs $CONTAINER_NAME           # View logs"
echo "  docker exec -it $CONTAINER_NAME sh    # Access container shell"
echo "  docker stop $CONTAINER_NAME           # Stop container"
echo "  docker restart $CONTAINER_NAME        # Restart container"
