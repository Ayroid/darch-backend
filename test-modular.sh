#!/bin/bash

# Darch Backend Modular Architecture Test Script
# This script demonstrates the new modular Terraform architecture capabilities

echo "🚀 Testing Darch Backend Modular Architecture"
echo "=============================================="

BASE_URL="http://localhost:3000"
API_V1="$BASE_URL/api"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if server is running
check_server() {
    echo -e "${BLUE}🔍 Checking if server is running...${NC}"
    if curl -s "$BASE_URL/health" > /dev/null; then
        echo -e "${GREEN}✅ Server is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Server is not running. Please start with 'npm run dev'${NC}"
        return 1
    fi
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo -e "\n${YELLOW}🧪 Testing: $description${NC}"
    echo -e "${BLUE}   $method $endpoint${NC}"

    if [ -n "$data" ]; then
        response=$(curl -s -X "$method" "$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -X "$method" "$endpoint")
    fi

    if echo "$response" | jq . > /dev/null 2>&1; then
        if echo "$response" | jq -r '.success' | grep -q "true"; then
            echo -e "${GREEN}   ✅ Success${NC}"
            echo "$response" | jq -r '.message // .data | keys // empty' | head -5
        else
            echo -e "${RED}   ❌ Failed${NC}"
            echo "$response" | jq -r '.error // .message'
        fi
    else
        echo -e "${RED}   ❌ Invalid JSON response${NC}"
        echo "$response" | head -3
    fi
}

# Sample architecture data
SAMPLE_ARCHITECTURE='{
  "architectureData": {
    "nodes": [
      {
        "id": "vpc-1",
        "name": "Main VPC",
        "resourceType": "aws-vpc",
        "nodeType": "container",
        "configuration": {
          "cidr_block": "10.0.0.0/16",
          "enable_dns_support": true,
          "enable_dns_hostnames": true
        }
      },
      {
        "id": "subnet-1",
        "name": "Public Subnet",
        "resourceType": "aws-public-subnet",
        "nodeType": "container",
        "parentId": "vpc-1",
        "configuration": {
          "cidr_block": "10.0.1.0/24",
          "availability_zone": "us-east-1a",
          "map_public_ip_on_launch": true
        }
      },
      {
        "id": "sg-1",
        "name": "Web Security Group",
        "resourceType": "security-group",
        "nodeType": "service",
        "parentId": "vpc-1",
        "configuration": {
          "ingress_rules": [
            {
              "from_port": 80,
              "to_port": 80,
              "protocol": "tcp",
              "cidr_blocks": ["0.0.0.0/0"],
              "description": "HTTP access"
            },
            {
              "from_port": 443,
              "to_port": 443,
              "protocol": "tcp",
              "cidr_blocks": ["0.0.0.0/0"],
              "description": "HTTPS access"
            }
          ]
        }
      },
      {
        "id": "ec2-1",
        "name": "Web Server",
        "resourceType": "aws-ec2",
        "nodeType": "service",
        "parentId": "subnet-1",
        "configuration": {
          "instance_type": "t3.micro",
          "ami_id": "ami-0c02fb55956c7d316"
        }
      },
      {
        "id": "s3-1",
        "name": "Static Assets",
        "resourceType": "s3",
        "nodeType": "service",
        "configuration": {
          "bucket_name": "my-static-assets-bucket",
          "versioning_enabled": true,
          "encryption_enabled": true
        }
      }
    ],
    "connections": [
      {
        "id": "conn-1",
        "sourceId": "vpc-1",
        "targetId": "subnet-1",
        "connectionType": "contains"
      },
      {
        "id": "conn-2",
        "sourceId": "subnet-1",
        "targetId": "ec2-1",
        "connectionType": "hosts"
      },
      {
        "id": "conn-3",
        "sourceId": "sg-1",
        "targetId": "ec2-1",
        "connectionType": "secures"
      }
    ],
    "metadata": {
      "provider": "aws",
      "region": "us-east-1",
      "environment": "development",
      "project": "web-application",
      "version": "1.0.0"
    }
  },
  "projectName": "web-app-infrastructure"
}'

# Module validation test data
MODULE_VALIDATION='{
  "category": "compute",
  "name": "ec2",
  "configuration": {
    "name": "test-instance",
    "instance_type": "t3.micro",
    "subnet_id": "subnet-12345",
    "security_group_ids": ["sg-12345"],
    "tags": {
      "Environment": "test"
    }
  }
}'

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq is required but not installed. Please install jq to run this test.${NC}"
    exit 1
fi

# Check if server is running
if ! check_server; then
    exit 1
fi

echo -e "\n${GREEN}🎯 Starting Modular Architecture Tests${NC}"
echo "========================================"

# Test 1: Get available modules
test_endpoint "GET" "$API_V1/modules" "" "Get Available Modules"

# Test 2: Get specific module details
test_endpoint "GET" "$API_V1/modules/compute/ec2" "" "Get EC2 Module Details"

# Test 3: Validate module configuration
test_endpoint "POST" "$API_V1/modules/validate" "$MODULE_VALIDATION" "Validate Module Configuration"

# Test 4: Validate architecture
test_endpoint "POST" "$API_V1/validate/architecture" "$SAMPLE_ARCHITECTURE" "Validate Architecture Design"

# Test 5: Validate dependencies
test_endpoint "POST" "$API_V1/validate/dependencies" "$SAMPLE_ARCHITECTURE" "Validate Dependencies"

# Test 6: Generate Terraform plan preview
test_endpoint "POST" "$API_V1/terraform/plan" "$SAMPLE_ARCHITECTURE" "Generate Terraform Plan Preview"

# Test 7: Generate modular Terraform
test_endpoint "POST" "$API_V1/generate-terraform" "$SAMPLE_ARCHITECTURE" "Generate Modular Terraform"

# Test 8: Refresh module registry
test_endpoint "POST" "$API_V1/modules/refresh" "" "Refresh Module Registry"

echo -e "\n${GREEN}🎉 Test Suite Completed${NC}"
echo "======================"

echo -e "\n${BLUE}📋 Test Summary:${NC}"
echo "• Module Management: Module listing, details, validation"
echo "• Architecture Validation: Structure and dependency validation"
echo "• Terraform Generation: Plan preview and modular generation"
echo "• Registry Management: Module registry refresh"

echo -e "\n${YELLOW}💡 Next Steps:${NC}"
echo "1. Check generated Terraform files in src/output/"
echo "2. Test the Terraform with 'terraform validate'"
echo "3. Deploy with 'terraform plan' and 'terraform apply'"

echo -e "\n${GREEN}✨ Modular Architecture is Ready!${NC}"
