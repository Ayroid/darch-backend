# Production Dockerfile for Darch Backend
FROM oven/bun:latest AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    curl \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Install Terraform
ARG TERRAFORM_VERSION=1.6.6
RUN wget https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
    unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
    mv terraform /usr/local/bin/ && \
    rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
    terraform version

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./
COPY tsconfig.json ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY src/ ./src/
COPY terraform-modules/ ./terraform-modules/

# Production stage
FROM oven/bun:latest AS production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    curl \
    bash \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Install Terraform
ARG TERRAFORM_VERSION=1.6.6
RUN wget https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
    unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
    mv terraform /usr/local/bin/ && \
    rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip

# Create non-root user for security
RUN groupadd -g 1001 bunjs && \
    useradd -m -u 1001 -g bunjs darch

# Set working directory
WORKDIR /app

# Copy application from builder stage
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/terraform-modules ./terraform-modules

# Create required directories
RUN mkdir -p src/output && \
    chown -R darch:bunjs /app

# Copy health check script
COPY --chown=darch:bunjs docker-healthcheck.sh ./
RUN chmod +x docker-healthcheck.sh

# Switch to non-root user
USER darch

# Expose port
EXPOSE 5000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ./docker-healthcheck.sh

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command - start the API server
CMD ["bun", "run", "src/index.ts"]
