# Deployment Guide

This guide covers deploying the Darch Backend - a modular Terraform generation platform with enterprise-grade architecture parsing and validation capabilities - in various environments, from development to production.

## Table of Contents

- [Overview](#overview)
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [CI/CD Setup](#cicd-setup)
- [Monitoring & Logging](#monitoring--logging)
- [Security](#security)
- [Module Registry Configuration](#module-registry-configuration)
- [Troubleshooting](#troubleshooting)

## Overview

The Darch Backend is a modular Terraform generation platform that can be deployed in several ways:

- **Local Development**: Direct Node.js execution with hot reloading
- **Docker**: Containerized deployment with module registry
- **Cloud Platforms**: AWS, Azure, GCP with auto-scaling
- **Container Orchestration**: Kubernetes, Docker Swarm
- **Platform as a Service**: Heroku, Railway, Vercel

### Key Features
- 🏗️ Modular Terraform generation
- 📦 Comprehensive module registry (200+ modules)
- 🔍 Advanced architecture validation
- 🌐 Multi-cloud provider support (AWS, Azure, GCP)
- 📊 Dependency resolution and conflict detection
- 🚀 Enterprise-grade performance and scalability

## Environment Setup

### Environment Variables

Create appropriate environment files for each deployment environment:

#### Development (.env.development)
```env
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug

# Module Registry Configuration
MODULE_CACHE_ENABLED=true
MODULE_CACHE_TTL=3600
MODULE_VALIDATION_STRICT=false

# Performance Settings
MAX_CONCURRENT_GENERATIONS=5
ARCHITECTURE_VALIDATION_TIMEOUT=30000
```

#### Staging (.env.staging)
```env
NODE_ENV=staging
PORT=5000
CORS_ORIGIN=https://staging-frontend.yourdomain.com
LOG_LEVEL=info

# Module Registry Configuration
MODULE_CACHE_ENABLED=true
MODULE_CACHE_TTL=7200
MODULE_VALIDATION_STRICT=true

# Performance Settings
MAX_CONCURRENT_GENERATIONS=10
ARCHITECTURE_VALIDATION_TIMEOUT=60000
```

#### Production (.env.production)
```env
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=warn

# Module Registry Configuration
MODULE_CACHE_ENABLED=true
MODULE_CACHE_TTL=14400
MODULE_VALIDATION_STRICT=true

# Performance Settings
MAX_CONCURRENT_GENERATIONS=20
ARCHITECTURE_VALIDATION_TIMEOUT=120000

# Security
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Required Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Application environment |
| `PORT` | No | `5000` | Server port |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origins |
| `LOG_LEVEL` | No | `info` | Logging level |
| `MODULE_CACHE_ENABLED` | No | `true` | Enable module registry caching |
| `MODULE_CACHE_TTL` | No | `3600` | Module cache TTL in seconds |
| `MODULE_VALIDATION_STRICT` | No | `false` | Strict module validation |
| `MAX_CONCURRENT_GENERATIONS` | No | `5` | Max concurrent Terraform generations |
| `ARCHITECTURE_VALIDATION_TIMEOUT` | No | `30000` | Validation timeout in ms |
| `RATE_LIMIT_ENABLED` | No | `false` | Enable API rate limiting |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window in ms |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window |

## Local Development

### Prerequisites

- Node.js 18.0.0+
- npm 9.0.0+

### Setup Steps

1. **Clone and install:**
   ```bash
   git clone https://github.com/Ayroid/Darch-Backend.git
   cd Darch-Backend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env file as needed
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Verify deployment:**
   ```bash
   # Health check
   curl http://localhost:5000/health

   # Module registry status
   curl http://localhost:5000/api/modules

   # Architecture validation
   curl -X POST http://localhost:5000/api/validate-architecture \
     -H "Content-Type: application/json" \
     -d '{"metadata":{"name":"test","provider":"aws"},"nodes":[],"connections":[]}'
   ```

### Development Server Features

- Hot reloading with nodemon for rapid development
- TypeScript compilation on file change
- Detailed error logging and stack traces
- CORS enabled for all origins
- Module registry auto-loading and validation
- Architecture validation with detailed feedback
- Comprehensive API endpoints for testing

## Production Deployment

### Prerequisites

- Node.js 18.0.0+ (LTS recommended)
- Process manager (PM2 recommended)
- Reverse proxy (Nginx recommended)
- SSL certificate

### Build for Production

1. **Install dependencies:**
   ```bash
   npm ci --only=production
   ```

2. **Build application:**
   ```bash
   npm run build
   ```

3. **Start production server:**
   ```bash
   npm start
   ```

### PM2 Process Management

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Create ecosystem file (`ecosystem.config.js`):**
   ```javascript
   module.exports = {
     apps: [{
       name: 'darch-backend',
       script: 'dist/index.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 5000
       },
       env_production: {
         NODE_ENV: 'production',
         PORT: 5000,
         CORS_ORIGIN: 'https://yourdomain.com'
       },
       error_file: './logs/err.log',
       out_file: './logs/out.log',
       log_file: './logs/combined.log',
       time: true,
       max_memory_restart: '1G',
       node_args: '--max-old-space-size=1024'
     }]
   };
   ```

3. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

### Nginx Configuration

Create `/etc/nginx/sites-available/darch-backend`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'" always;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (optional caching)
    location /health {
        proxy_pass http://localhost:5000;
        proxy_cache_valid 200 30s;
    }

    # Static files for downloads (if needed)
    location /downloads/ {
        alias /path/to/terraform/files/;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/darch-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Docker Deployment

### Basic Docker Setup

1. **Build image:**
   ```bash
   docker build -t darch-backend .
   ```

2. **Run container:**
   ```bash
   docker run -d \
     --name darch-backend \
     -p 5000:5000 \
     -e NODE_ENV=production \
     -e CORS_ORIGIN=https://yourdomain.com \
     --restart unless-stopped \
     darch-backend
   ```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  darch-backend:
    build: .
    container_name: darch-backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - CORS_ORIGIN=https://yourdomain.com
    volumes:
      - ./logs:/app/logs
      - terraform-files:/app/src/output
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  nginx:
    image: nginx:alpine
    container_name: darch-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - darch-backend
    restart: unless-stopped

volumes:
  terraform-files:
```

Start with Docker Compose:
```bash
docker-compose up -d
```

### Multi-stage Dockerfile

For production optimization:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=development

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/data ./src/data

# Create output directory
RUN mkdir -p src/output && chown -R nextjs:nodejs src/output

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

## Cloud Deployment

### AWS Deployment

#### EC2 Deployment

1. **Launch EC2 instance:**
   - Ubuntu 22.04 LTS
   - t3.small or larger
   - Security group allowing HTTP/HTTPS

2. **Setup script:**
   ```bash
   #!/bin/bash

   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install PM2
   sudo npm install -g pm2

   # Install Nginx
   sudo apt install -y nginx

   # Clone and setup application
   git clone https://github.com/Ayroid/Darch-Backend.git
   cd Darch-Backend
   npm ci --only=production
   npm run build

   # Start with PM2
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

#### ECS Deployment

Create `task-definition.json`:

```json
{
  "family": "darch-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "darch-backend",
      "image": "your-account.dkr.ecr.region.amazonaws.com/darch-backend:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/darch-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:5000/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Azure Deployment

#### Azure Container Instances

```bash
# Create resource group
az group create --name darch-rg --location eastus

# Deploy container
az container create \
  --resource-group darch-rg \
  --name darch-backend \
  --image your-registry/darch-backend:latest \
  --dns-name-label darch-backend \
  --ports 5000 \
  --environment-variables NODE_ENV=production \
  --cpu 1 \
  --memory 1
```

### Google Cloud Platform

#### Cloud Run Deployment

```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/PROJECT-ID/darch-backend

# Deploy to Cloud Run
gcloud run deploy darch-backend \
  --image gcr.io/PROJECT-ID/darch-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

### Heroku Deployment

1. **Create Heroku app:**
   ```bash
   heroku create your-app-name
   ```

2. **Set environment variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set CORS_ORIGIN=https://your-frontend.com
   ```

3. **Deploy:**
   ```bash
   git push heroku main
   ```

4. **Create Procfile:**
   ```
   web: node dist/index.js
   ```

## CI/CD Setup

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run tests
        run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --only=production

      - name: Build application
        run: npm run build

      - name: Build Docker image
        run: |
          docker build -t darch-backend:${{ github.sha }} .
          docker tag darch-backend:${{ github.sha }} darch-backend:latest

      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /path/to/app
            git pull origin main
            npm ci --only=production
            npm run build
            pm2 restart darch-backend
```

### GitLab CI/CD

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

test:
  stage: test
  image: node:$NODE_VERSION
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run build
    - npm test
  only:
    - main
    - merge_requests

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - main

deploy:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
  script:
    - ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_HOST "
        cd /path/to/app &&
        git pull origin main &&
        npm ci --only=production &&
        npm run build &&
        pm2 restart darch-backend
      "
  only:
    - main
```

## Monitoring & Logging

### Application Monitoring

1. **Health Check Endpoint:**
   Already implemented at `/health`

2. **PM2 Monitoring:**
   ```bash
   pm2 monit
   pm2 logs darch-backend
   ```

3. **System Monitoring:**
   ```bash
   # Install htop for system monitoring
   sudo apt install htop

   # Monitor system resources
   htop
   ```

### Logging Configuration

1. **Structured Logging:**
   ```typescript
   // In production, consider using winston
   import winston from 'winston';

   const logger = winston.createLogger({
     level: process.env.LOG_LEVEL || 'info',
     format: winston.format.combine(
       winston.format.timestamp(),
       winston.format.json()
     ),
     transports: [
       new winston.transports.File({ filename: 'error.log', level: 'error' }),
       new winston.transports.File({ filename: 'combined.log' })
     ]
   });
   ```

2. **Log Rotation:**
   ```bash
   # Install logrotate
   sudo apt install logrotate

   # Create logrotate config
   cat > /etc/logrotate.d/darch-backend << EOF
   /path/to/app/logs/*.log {
     daily
     missingok
     rotate 52
     compress
     delaycompress
     notifempty
     create 644 nodejs nodejs
     postrotate
       pm2 reload darch-backend
     endscript
   }
   EOF
   ```

### External Monitoring Services

1. **Uptime Monitoring:**
   - UptimeRobot
   - Pingdom
   - StatusCake

2. **Application Performance:**
   - New Relic
   - DataDog
   - AppDynamics

3. **Log Aggregation:**
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Splunk
   - CloudWatch Logs

## Security

### SSL/TLS Configuration

1. **Let's Encrypt (Free SSL):**
   ```bash
   # Install Certbot
   sudo snap install core; sudo snap refresh core
   sudo snap install --classic certbot

   # Obtain certificate
   sudo certbot --nginx -d api.yourdomain.com

   # Auto-renewal
   sudo certbot renew --dry-run
   ```

2. **Security Headers:**
   Already configured in Nginx example above

### Firewall Configuration

```bash
# Ubuntu UFW
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Or for specific IPs
sudo ufw allow from YOUR_IP to any port 22
```

### Security Best Practices

1. **Environment Variables:**
   - Never commit secrets to version control
   - Use environment-specific configurations
   - Rotate secrets regularly

2. **Dependencies:**
   ```bash
   # Audit dependencies
   npm audit
   npm audit fix

   # Keep dependencies updated
   npm update
   ```

3. **User Permissions:**
   - Run application as non-root user
   - Limit file permissions
   - Use proper directory ownership

## Module Registry Configuration

### Pre-deployment Module Setup

The Darch Backend includes a comprehensive module registry that must be properly configured for deployment:

#### 1. Module Directory Structure Verification

Ensure the module registry structure is intact:

```bash
# Verify module registry structure
ls -la src/modules/registry/

# Should show:
# networking/    - VPC, subnets, gateways, load balancers
# compute/       - EC2, auto-scaling, containers
# security/      - Security groups, IAM, certificates
# storage/       - S3, EBS, EFS, databases
# monitoring/    - CloudWatch, logging, alerting
# analytics/     - Data processing, ETL, warehousing

# Verify module completeness
find src/modules/registry -name "metadata.json" | wc -l
# Should return 200+ modules
```

#### 2. Module Validation on Deployment

```bash
# Validate all modules before deployment
npm run validate-modules

# Check specific module categories
npm run validate-modules -- --category networking
npm run validate-modules -- --category compute

# Test module loading performance
npm run benchmark-modules
```

#### 3. Production Module Registry Optimization

For production deployments, optimize module loading:

```bash
# Pre-compile module templates
npm run compile-modules

# Generate module registry cache
npm run cache-modules

# Validate module dependencies
npm run validate-dependencies
```

#### 4. Custom Module Integration

To add custom modules for deployment:

```bash
# Create custom module directory
mkdir -p src/modules/registry/custom/

# Add custom module
cat > src/modules/registry/custom/my-service/metadata.json << 'EOF'
{
  "name": "my-service",
  "category": "custom",
  "version": "1.0.0",
  "description": "Custom organization service",
  "terraform_provider": "aws",
  "variables": [...],
  "outputs": [...],
  "dependencies": []
}
EOF

# Validate custom module
npm run validate-modules -- --path src/modules/registry/custom/my-service
```

### Module Registry Performance Configuration

#### Memory Optimization
```javascript
// In ecosystem.config.js
module.exports = {
  apps: [{
    name: 'darch-backend',
    script: 'dist/index.js',
    instances: 'max',
    node_args: [
      '--max-old-space-size=2048',
      '--optimize-for-size'
    ],
    env_production: {
      MODULE_CACHE_SIZE: '1000',
      MODULE_PRELOAD_ENABLED: 'true',
      MODULE_LAZY_LOADING: 'false'
    }
  }]
};
```

#### Caching Strategy
```bash
# Redis configuration for module caching (optional)
# Install Redis for production module caching
sudo apt install redis-server

# Configure Redis for module cache
cat >> /etc/redis/redis.conf << 'EOF'
# Module cache configuration
maxmemory 256mb
maxmemory-policy allkeys-lru
EOF
```

### Module Registry Health Checks

Add module-specific health checks:

```nginx
# In nginx configuration
location /health/modules {
    proxy_pass http://localhost:5000/api/modules/health;
    proxy_cache module_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
}

location /health/registry {
    proxy_pass http://localhost:5000/api/registry/status;
    access_log off;
}
```

## Troubleshooting

### Common Deployment Issues

#### 1. Port Already in Use
```bash
# Find process using port
sudo lsof -i :5000
sudo kill -9 PID

# Or change port
PORT=3000 npm start
```

#### 2. Permission Denied
```bash
# Fix file permissions
sudo chown -R $USER:$USER /path/to/app
chmod +x /path/to/app/node_modules/.bin/*
```

#### 3. Out of Memory
```bash
# Increase Node.js memory limit
node --max-old-space-size=2048 dist/index.js

# Or in PM2 ecosystem
node_args: '--max-old-space-size=2048'
```

#### 4. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in certificate.crt -text -noout

# Verify Nginx configuration
sudo nginx -t
```

### Health Check Commands

```bash
# Application health
curl http://localhost:5000/health

# Module registry health
curl http://localhost:5000/api/modules/health

# Architecture validation service
curl http://localhost:5000/api/validate/health

# System resources
free -h
df -h
top

# Process status
pm2 status
pm2 logs darch-backend --lines 50

# Module registry performance
curl http://localhost:5000/api/modules/stats

# Network connectivity
netstat -tlnp | grep :5000
```

### Module Registry Troubleshooting

#### 1. Module Loading Issues
```bash
# Check module registry logs
pm2 logs darch-backend | grep "MODULE"

# Validate specific module
curl http://localhost:5000/api/modules/validate/vpc

# Check module dependencies
curl http://localhost:5000/api/modules/dependencies/ec2
```

#### 2. Architecture Validation Failures
```bash
# Test architecture validation
curl -X POST http://localhost:5000/api/validate-architecture \
  -H "Content-Type: application/json" \
  -d @test-architecture.json

# Check validation logs
pm2 logs darch-backend | grep "VALIDATION"

# Debug specific resource validation
curl -X POST http://localhost:5000/api/validate/resource \
  -H "Content-Type: application/json" \
  -d '{"resourceType":"vpc","configuration":{"cidr_block":"10.0.0.0/16"}}'
```

#### 3. Terraform Generation Issues
```bash
# Test Terraform generation
curl -X POST http://localhost:5000/api/generate-terraform \
  -H "Content-Type: application/json" \
  -d @test-architecture.json

# Check generation logs
pm2 logs darch-backend | grep "TERRAFORM"

# Validate generated Terraform
terraform validate /path/to/generated/main.tf
```

#### 4. Performance Issues
```bash
# Check module cache status
curl http://localhost:5000/api/cache/status

# Monitor generation performance
curl http://localhost:5000/api/stats/performance

# Clear module cache if needed
curl -X DELETE http://localhost:5000/api/cache/modules
```

### Rollback Procedures

1. **PM2 Rollback:**
   ```bash
   # Stop current version
   pm2 stop darch-backend

   # Checkout previous version
   git checkout HEAD~1
   npm ci --only=production
   npm run build

   # Restart
   pm2 start darch-backend
   ```

2. **Docker Rollback:**
   ```bash
   # Stop current container
   docker stop darch-backend

   # Run previous version
   docker run -d --name darch-backend darch-backend:previous-tag
   ```

### Performance Optimization

1. **Node.js Optimization:**
   ```bash
   # Enable production optimizations
   NODE_ENV=production npm start

   # Use cluster mode
   pm2 start ecosystem.config.js -i max
   ```

2. **Nginx Optimization:**
   ```nginx
   # Enable gzip compression
   gzip on;
   gzip_types text/plain application/json;

   # Enable caching
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
     expires 1y;
     add_header Cache-Control "public, immutable";
   }
   ```

3. **Database Optimization (if applicable):**
   - Add database indices
   - Implement connection pooling
   - Use read replicas for scaling

---

This deployment guide provides comprehensive coverage for deploying the Darch Backend in various environments. Choose the deployment method that best fits your infrastructure requirements and organizational needs.
