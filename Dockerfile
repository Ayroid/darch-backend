# Use Node.js 18 as base image
FROM node:18-alpine

# Install necessary packages including terraform
RUN apk add --no-cache \
    wget \
    unzip \
    curl \
    bash

# Install Terraform
ARG TERRAFORM_VERSION=1.5.7
RUN wget https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
    unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
    mv terraform /usr/local/bin/ && \
    rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript project
RUN npm run build

# Create output directory if it doesn't exist
RUN mkdir -p src/output

# Create a test script for Terraform validation
COPY test-terraform.sh /app/test-terraform.sh
RUN chmod +x /app/test-terraform.sh

# Expose port (if needed for future web interface)
EXPOSE 3000

# Default command - run the test script
CMD ["/bin/bash", "/app/test-terraform.sh"]
