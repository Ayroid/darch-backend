#!/bin/bash

# Test script for the clean architecture format
# This script demonstrates how to use the new clean format endpoints

set -e

BACKEND_URL="http://localhost:3001"
API_BASE="$BACKEND_URL/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Darch Clean Format API Test ===${NC}"
echo

# Function to check if backend is running
check_backend() {
    echo -e "${YELLOW}Checking backend health...${NC}"
    if curl -s "$BACKEND_URL/health" > /dev/null; then
        echo -e "${GREEN}✓ Backend is running${NC}"
    else
        echo -e "${RED}✗ Backend is not running. Please start it with: npm run dev${NC}"
        exit 1
    fi
    echo
}

# Function to test clean format example endpoint
test_clean_example() {
    echo -e "${YELLOW}Testing clean format example endpoint...${NC}"
    
    response=$(curl -s "$API_BASE/examples/clean-format")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Clean format example retrieved successfully${NC}"
        echo -e "${BLUE}Example metadata:${NC}"
        echo "$response" | jq -r '.data.exampleCleanData.metadata | {name, provider, environment}'
        echo
    else
        echo -e "${RED}✗ Failed to get clean format example${NC}"
        echo "$response" | jq '.'
        echo
    fi
}

# Function to test legacy to clean conversion
test_legacy_conversion() {
    echo -e "${YELLOW}Testing legacy to clean conversion...${NC}"
    
    # Create a legacy format example
    legacy_data='{
        "metadata": {
            "name": "Test Architecture",
            "description": "Test conversion from legacy to clean",
            "version": "1.0.0",
            "provider": "aws",
            "region": "us-east-1",
            "environment": "test",
            "project": "test-project",
            "createdAt": "2025-09-08T18:00:00.000Z",
            "lastModified": "2025-09-08T18:00:00.000Z",
            "tags": {
                "Environment": "test",
                "Project": "test-project"
            }
        },
        "nodes": [
            {
                "id": "test-vpc",
                "resourceType": "vpc",
                "name": "test-vpc",
                "nodeType": "awsService",
                "position": { "x": 100, "y": 100 },
                "configuration": {
                    "cidr_block": "10.0.0.0/16",
                    "enable_dns_hostnames": true,
                    "enable_dns_support": true,
                    "tags": { "Name": "test-vpc" }
                }
            },
            {
                "id": "test-subnet",
                "resourceType": "subnet",
                "name": "test-subnet",
                "nodeType": "awsService",
                "position": { "x": 200, "y": 200 },
                "configuration": {
                    "vpc_id": "test-vpc",
                    "cidr_block": "10.0.1.0/24",
                    "availability_zone": "us-east-1a",
                    "subnet_type": "private",
                    "map_public_ip_on_launch": false,
                    "tags": { "Name": "test-subnet" }
                }
            }
        ],
        "connections": [
            {
                "source": "test-vpc",
                "target": "test-subnet",
                "type": "contains"
            }
        ]
    }'
    
    response=$(curl -s -X POST "$API_BASE/convert/to-clean" \
        -H "Content-Type: application/json" \
        -d "{\"architectureData\": $legacy_data}")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Legacy to clean conversion successful${NC}"
        echo -e "${BLUE}Converted architecture name:${NC}"
        echo "$response" | jq -r '.data.cleanArchitectureData.metadata.name'
        echo -e "${BLUE}Infrastructure components:${NC}"
        echo "$response" | jq -r '.data.cleanArchitectureData.infrastructure | keys[]'
        echo
    else
        echo -e "${RED}✗ Legacy to clean conversion failed${NC}"
        echo "$response" | jq '.'
        echo
    fi
}

# Function to test Terraform generation with clean format
test_clean_terraform_generation() {
    echo -e "${YELLOW}Testing Terraform generation with clean format...${NC}"
    
    # Get the clean example first
    example_response=$(curl -s "$API_BASE/examples/clean-format")
    clean_data=$(echo "$example_response" | jq '.data.exampleCleanData')
    
    # Generate Terraform
    response=$(curl -s -X POST "$API_BASE/generate-terraform" \
        -H "Content-Type: application/json" \
        -d "{\"architectureData\": $clean_data, \"projectName\": \"clean-format-test\"}")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Terraform generation with clean format successful${NC}"
        echo -e "${BLUE}Format used:${NC}"
        echo "$response" | jq -r '.data.formatUsed'
        echo -e "${BLUE}Modules generated:${NC}"
        echo "$response" | jq -r '.data.moduleMapping.modulesGenerated'
        echo -e "${BLUE}Project name:${NC}"
        echo "$response" | jq -r '.data.projectName'
        echo
    else
        echo -e "${RED}✗ Terraform generation with clean format failed${NC}"
        echo "$response" | jq '.'
        echo
    fi
}

# Function to test validation
test_validation() {
    echo -e "${YELLOW}Testing clean format validation...${NC}"
    
    # Test with invalid clean data
    invalid_data='{
        "metadata": {
            "name": "",
            "provider": {
                "name": "invalid-provider",
                "region": ""
            }
        },
        "infrastructure": {},
        "deployment": {}
    }'
    
    response=$(curl -s -X POST "$API_BASE/generate-terraform" \
        -H "Content-Type: application/json" \
        -d "{\"architectureData\": $invalid_data}")
    
    if echo "$response" | jq -e '.success == false' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Validation correctly rejected invalid data${NC}"
        echo -e "${BLUE}Validation errors detected${NC}"
        echo
    else
        echo -e "${RED}✗ Validation should have failed for invalid data${NC}"
        echo
    fi
}

# Function to display usage information
show_usage() {
    echo -e "${BLUE}=== Clean Format API Usage ===${NC}"
    echo
    echo -e "${YELLOW}Available endpoints:${NC}"
    echo "GET  $API_BASE/examples/clean-format        - Get example clean format data"
    echo "POST $API_BASE/convert/to-clean             - Convert legacy to clean format"
    echo "POST $API_BASE/generate-terraform           - Generate Terraform (supports both formats)"
    echo "POST $API_BASE/validate/architecture        - Validate architecture data"
    echo
    echo -e "${YELLOW}Example usage:${NC}"
    echo "# Get clean format example"
    echo "curl $API_BASE/examples/clean-format"
    echo
    echo "# Convert legacy to clean"
    echo "curl -X POST $API_BASE/convert/to-clean \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d @legacy-data.json"
    echo
    echo "# Generate Terraform with clean format"
    echo "curl -X POST $API_BASE/generate-terraform \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d @clean-data.json"
    echo
}

# Main execution
main() {
    case "${1:-all}" in
        "health")
            check_backend
            ;;
        "example")
            check_backend
            test_clean_example
            ;;
        "convert")
            check_backend
            test_legacy_conversion
            ;;
        "generate")
            check_backend
            test_clean_terraform_generation
            ;;
        "validate")
            check_backend
            test_validation
            ;;
        "usage")
            show_usage
            ;;
        "all")
            check_backend
            test_clean_example
            test_legacy_conversion
            test_clean_terraform_generation
            test_validation
            echo -e "${GREEN}=== All tests completed ===${NC}"
            echo
            show_usage
            ;;
        *)
            echo "Usage: $0 [health|example|convert|generate|validate|usage|all]"
            exit 1
            ;;
    esac
}

main "$@"
