# 🐳 Docker Deployment Guide

## Docker Setup for Darch Backend

This guide covers how to run the Darch Backend using Docker in both development and production environments.

---

## 🚀 **Quick Start**

### **Production Deployment**
```bash
# Deploy production version
./deploy.sh

# API will be available at: http://localhost:5000
```

### **Development with Hot Reload**
```bash
# Start development version with hot reload
./dev.sh

# Development API will be available at: http://localhost:5001
```

---

## 📋 **Available Commands**

### **NPM Scripts**
```bash
# Docker commands
npm run docker:dev       # Start development environment
npm run docker:prod      # Deploy production environment
npm run docker:build     # Build production image
npm run docker:build:dev # Build development image
npm run docker:run       # Run production container
npm run docker:logs      # View production logs
npm run docker:logs:dev  # View development logs
npm run docker:stop      # Stop all containers
npm run docker:clean     # Clean up containers and images
```

### **Direct Docker Commands**
```bash
# Production
docker build -t darch-backend .
docker run -d --name darch-backend-api -p 5000:5000 \
  -v $(pwd)/src/output:/app/src/output darch-backend

# Development
docker build -f Dockerfile.dev -t darch-backend-dev .
docker run -d --name darch-backend-dev -p 5001:5000 \
  -v $(pwd)/src:/app/src \
  -v $(pwd)/src/output:/app/src/output \
  darch-backend-dev
```

---

## 🏗️ **Architecture**

### **Multi-Stage Production Build**
- **Builder Stage**: Compiles TypeScript and installs dependencies
- **Production Stage**: Minimal runtime image with only necessary files
- **Security**: Runs as non-root user
- **Health Checks**: Built-in health monitoring

### **Container Setup**

| Container | Port | Description | Image |
|-----------|------|-------------|-------|
| `darch-backend-api` | 5000 | Production API | `darch-backend` |
| `darch-backend-dev` | 5001 | Development API with hot reload | `darch-backend-dev` |

---

## 🔧 **Configuration**

### **Environment Variables**

```bash
# Production
NODE_ENV=production
PORT=5000
API_HOST=0.0.0.0

# Development
NODE_ENV=development
PORT=5000
API_HOST=0.0.0.0
```

### **Volume Mounts**

```bash
# Production - Generated files only
-v $(pwd)/src/output:/app/src/output

# Development - Source code + output
-v $(pwd)/src:/app/src
-v $(pwd)/src/output:/app/src/output
-v $(pwd)/terraform-modules:/app/terraform-modules
```

---

## 🏥 **Health Monitoring**

### **Health Check Endpoint**
```bash
curl http://localhost:5000/health
```

### **Docker Health Check**
```bash
# Check container health
docker ps
# Look for "healthy" status

# Manual health check
docker exec darch-backend-api ./docker-healthcheck.sh
```

### **Health Check Components**
- ✅ API server responding on port 5000
- ✅ Terraform binary available
- ✅ Basic functionality test

---

## 📊 **Monitoring & Debugging**

### **View Logs**
```bash
# Production logs
docker logs -f darch-backend-api

# Development logs
docker logs -f darch-backend-dev

# NPM script shortcuts
npm run docker:logs      # Production logs
npm run docker:logs:dev  # Development logs
```

### **Execute Commands in Container**
```bash
# Access production container shell
docker exec -it darch-backend-api sh

# Access development container shell
docker exec -it darch-backend-dev sh

# Check Terraform version
docker exec darch-backend-api terraform version

# Test API from inside container
docker exec darch-backend-api curl http://localhost:5000/health
```

### **Debug API**
```bash
# Test API endpoints
curl http://localhost:5000/health
curl http://localhost:5001/health  # Development

# Test Terraform generation
curl -X POST http://localhost:5000/api/generate-terraform \
  -H "Content-Type: application/json" \
  -d '{"architectureData":{"metadata":{"name":"test","version":"1.0.0","createdAt":"2025-09-10T18:00:00.000Z","lastModified":"2025-09-10T18:00:00.000Z","provider":"aws"},"nodes":[],"connections":[]},"projectName":"test"}'
```

---

## 🔒 **Security Features**

- **Non-root user**: Application runs as user `darch` (UID 1001)
- **Minimal base image**: Alpine Linux for smaller attack surface
- **Volume isolation**: Only necessary directories mounted
- **Health monitoring**: Automatic container restart on failure
- **Signal handling**: Proper cleanup with dumb-init

---

## 🚧 **Development Workflow**

### **Local Development with Docker**

1. **Start development environment:**
   ```bash
   ./dev.sh
   ```

2. **Make changes to source code:**
   - Edit files in `src/`
   - Nodemon will automatically restart the server
   - Changes are reflected immediately

3. **View logs:**
   ```bash
   npm run docker:logs:dev
   ```

4. **Test API:**
   ```bash
   curl http://localhost:5001/health
   ```

5. **Stop when done:**
   ```bash
   docker stop darch-backend-dev
   ```

---

## 🔄 **Container Management**

### **Production Container**
```bash
# Start production container
./deploy.sh

# Stop production container
docker stop darch-backend-api

# Restart production container
docker restart darch-backend-api

# Remove production container
docker rm darch-backend-api
```

### **Development Container**
```bash
# Start development container
./dev.sh

# Stop development container
docker stop darch-backend-dev

# Remove development container
docker rm darch-backend-dev
```

### **Both Containers**
```bash
# Stop all containers
npm run docker:stop

# Clean up everything
npm run docker:clean
```

---

## 🧹 **Cleanup**

### **Remove Everything**
```bash
# Stop and remove containers, clean images
npm run docker:clean

# More aggressive cleanup
docker system prune -af --volumes
```

### **Reset Development Environment**
```bash
# Remove development container and rebuild
docker stop darch-backend-dev
docker rm darch-backend-dev
docker rmi darch-backend-dev
npm run docker:build:dev
./dev.sh
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

**Port already in use:**
```bash
# Find process using port
lsof -i :5000
lsof -i :5001

# Stop containers using ports
docker stop darch-backend-api darch-backend-dev
```

**Container won't start:**
```bash
# Check logs
docker logs darch-backend-api
docker logs darch-backend-dev

# Check health
docker exec darch-backend-api ./docker-healthcheck.sh
```

**Build failures:**
```bash
# Clean build
docker build --no-cache -t darch-backend .

# Check available space
docker system df
```

**Permission issues:**
```bash
# Fix output directory permissions
sudo chown -R $USER:$USER src/output/

# Check container user
docker exec darch-backend-api whoami
```

---

## 📈 **Performance Optimization**

### **Production Optimizations**
- Multi-stage build reduces image size
- npm ci for faster, reliable installs
- Minimal runtime dependencies
- Optimized layer caching

### **Development Optimizations**
- Volume mounts for hot reload
- Separate dev dependencies
- Faster rebuild times

---

## � **Manual Docker Commands**

### **Build Images**
```bash
# Production image
docker build -t darch-backend .

# Development image
docker build -f Dockerfile.dev -t darch-backend-dev .
```

### **Run Containers**
```bash
# Production container
docker run -d \
  --name darch-backend-api \
  -p 5000:5000 \
  -v $(pwd)/src/output:/app/src/output \
  -e NODE_ENV=production \
  --restart unless-stopped \
  darch-backend

# Development container
docker run -d \
  --name darch-backend-dev \
  -p 5001:5000 \
  -v $(pwd)/src:/app/src \
  -v $(pwd)/src/output:/app/src/output \
  -v $(pwd)/terraform-modules:/app/terraform-modules \
  -e NODE_ENV=development \
  darch-backend-dev
```

---

## ✅ **Quick Reference**

### **URLs**
- **Production**: http://localhost:5000
- **Development**: http://localhost:5001
- **Health Check**: `/health`
- **API Endpoint**: `/api/generate-terraform`

### **Key Files**
- `Dockerfile` - Production image definition
- `Dockerfile.dev` - Development image definition
- `deploy.sh` - Production deployment script
- `dev.sh` - Development startup script
- `docker-healthcheck.sh` - Health check script

### **Useful Commands**
```bash
./deploy.sh                    # Deploy production
./dev.sh                       # Start development
npm run docker:logs            # View production logs
npm run docker:logs:dev        # View development logs
npm run docker:stop            # Stop all containers
npm run docker:clean           # Clean up everything
```

This simplified Docker setup provides all the functionality without the complexity of Docker Compose! 🚀
