#!/bin/bash

# Phase 5 & 6 Validation Script
# Tests the complete pipeline from architecture JSON to Terraform generation

echo "==================================="
echo "Phase 5 & 6 Validation Test"
echo "==================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test files
TEST_DIR="/home/ayroid/Documents/Private/Projects/Darch/backend"
TEST_REQUEST="$TEST_DIR/test-request.json"
TEST_OUTPUT="$TEST_DIR/test-terraform-output"

echo "Step 1: Checking if backend is running..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${YELLOW}⚠ Backend not running. Starting backend...${NC}"
    cd "$TEST_DIR"
    PORT=3001 npm start > /tmp/backend-test.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    sleep 5
    
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend started successfully${NC}"
    else
        echo -e "${RED}✗ Failed to start backend${NC}"
        echo "Check logs at /tmp/backend-test.log"
        exit 1
    fi
fi

echo ""
echo "Step 2: Generating Terraform code..."
HTTP_CODE=$(curl -s -o "$TEST_OUTPUT.zip" -w "%{http_code}" \
    -X POST http://localhost:3001/api/terraform/generate \
    -H "Content-Type: application/json" \
    -d @"$TEST_REQUEST")

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Terraform generation successful (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Terraform generation failed (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

echo ""
echo "Step 3: Extracting and validating generated files..."
rm -rf "$TEST_OUTPUT"
mkdir -p "$TEST_OUTPUT"
cd "$TEST_OUTPUT"
unzip -q ../test-terraform-output.zip

if [ -f "main.tf" ] && [ -f "variables.tf" ] && [ -f "outputs.tf" ]; then
    echo -e "${GREEN}✓ All required Terraform files generated${NC}"
else
    echo -e "${RED}✗ Missing required Terraform files${NC}"
    exit 1
fi

echo ""
echo "Step 4: Checking for module references..."

# Check that module references are used (not raw IDs)
if grep -q 'module\.' main.tf; then
    echo -e "${GREEN}✓ Module references found in main.tf${NC}"
    
    # Count module references
    MODULE_COUNT=$(grep -o 'module\.[a-z0-9_]*\.' main.tf | sort -u | wc -l)
    echo "  Found $MODULE_COUNT unique module references"
else
    echo -e "${RED}✗ No module references found (Phase 1 FAILED)${NC}"
fi

echo ""
echo "Step 5: Validating NAT Gateway module..."

if grep -q 'nat.*gateway' main.tf; then
    echo -e "${GREEN}✓ NAT Gateway module present${NC}"
    
    # Check for connectivity_type
    if grep -q 'connectivity_type' main.tf; then
        echo -e "${GREEN}✓ connectivity_type parameter found${NC}"
    else
        echo -e "${RED}✗ connectivity_type parameter missing${NC}"
    fi
    
    # Check for create_eip
    if grep -q 'create_eip' main.tf; then
        echo -e "${GREEN}✓ create_eip parameter found${NC}"
    else
        echo -e "${YELLOW}⚠ create_eip parameter not found (optional)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ NAT Gateway module not found in output${NC}"
fi

echo ""
echo "Step 6: Validating cross-module references..."

# Check specific module references
CHECKS=(
    "module.*\.vpc_id"
    "module.*\.subnet_id"
    "module.*\.security_group_id"
    "module.*\.internet_gateway_id"
)

for check in "${CHECKS[@]}"; do
    if grep -qE "$check" main.tf; then
        echo -e "${GREEN}✓ Found reference pattern: $check${NC}"
    else
        echo -e "${YELLOW}⚠ Reference pattern not found: $check${NC}"
    fi
done

echo ""
echo "Step 7: Running Terraform validation..."

if command -v terraform > /dev/null 2>&1; then
    terraform init -upgrade > /dev/null 2>&1
    if terraform validate > /tmp/tf-validate.log 2>&1; then
        echo -e "${GREEN}✓ Terraform configuration is valid${NC}"
    else
        echo -e "${RED}✗ Terraform validation failed${NC}"
        echo "Error output:"
        cat /tmp/tf-validate.log
    fi
else
    echo -e "${YELLOW}⚠ Terraform not installed, skipping validation${NC}"
fi

echo ""
echo "==================================="
echo "Validation Complete!"
echo "==================================="
echo ""
echo "Generated files location: $TEST_OUTPUT"
echo "View main.tf: cat $TEST_OUTPUT/main.tf"
echo ""
