#!/bin/bash
# Development environment startup script using Docker

set -e

echo "🔧 Starting Darch Backend in development mode..."

# Configuration
IMAGE_NAME="darch-backend-dev"
CONTAINER_NAME="darch-backend-dev"
PORT="5001"
SOURCE_DIR="$(pwd)/src"
OUTPUT_DIR="$(pwd)/src/output"
MODULES_DIR="$(pwd)/terraform-modules"

# Ensure directories exist
mkdir -p "$OUTPUT_DIR"

# Build the development image
echo "📦 Building development Docker image..."
docker build -f Dockerfile.dev -t $IMAGE_NAME .

# Stop and remove existing container if it exists
echo "🛑 Stopping existing development container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Start the development container with volume mounts for hot reload
echo "🏃 Starting development container with hot reload..."
docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:5000 \
  -v "$SOURCE_DIR:/app/src" \
  -v "$OUTPUT_DIR:/app/src/output" \
  -v "$MODULES_DIR:/app/terraform-modules" \
  -v "$(pwd)/package.json:/app/package.json" \
  -v "$(pwd)/tsconfig.json:/app/tsconfig.json" \
  -v "$(pwd)/nodemon.json:/app/nodemon.json" \
  -e NODE_ENV=development \
  -e PORT=5000 \
  -e API_HOST=0.0.0.0 \
  $IMAGE_NAME

echo "🌐 Development API will be available at: http://localhost:$PORT"
echo "🔄 Hot reload is enabled - changes to src/ will restart the server"
echo "📁 Output directory: $OUTPUT_DIR"
echo ""
echo "📋 Following logs (Ctrl+C to stop watching)..."
echo "📋 Useful commands:"
echo "  docker logs -f $CONTAINER_NAME         # Follow logs"
echo "  docker exec -it $CONTAINER_NAME sh     # Access container shell"
echo "  docker stop $CONTAINER_NAME            # Stop container"
echo ""

# Follow logs
docker logs -f $CONTAINER_NAME
