#!/bin/bash

# Terraform test script
set -e

echo "🚀 Starting Terraform Configuration Test..."

# Generate the Terraform configuration
echo "📝 Generating Terraform configuration..."
npm start

# Navigate to output directory
cd src/output

echo "📋 Generated Terraform file:"
echo "================================"
cat main.tf
echo "================================"

# Initialize Terraform
echo "🔧 Initializing Terraform..."
terraform init

# Validate the configuration
echo "✅ Validating Terraform configuration..."
terraform validate

# Format check
# echo "🎨 Checking Terraform formatting..."
# terraform fmt -check=true -diff=true

# Plan (dry run)
echo "📊 Running Terraform plan (dry run)..."
terraform plan

echo "🎉 All tests passed!"
