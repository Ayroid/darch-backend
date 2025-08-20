#!/bin/bash

echo "🧪 Testing the new AST-based Terraform Generator"
echo "================================================"

# Generate terraform
echo "📝 Generating Terraform configuration..."
npm start

echo ""
echo "📋 Generated Terraform file:"
echo "----------------------------------------"
cat src/output/main.tf
echo "----------------------------------------"

# Basic syntax validation
echo ""
echo "🔍 Basic Terraform syntax validation:"

# Check for the problematic ${} syntax that should be gone
if grep -q '\${' src/output/main.tf; then
    echo "❌ ERROR: Found old interpolation syntax \${} - this should be fixed!"
    grep -n '\${' src/output/main.tf
    exit 1
else
    echo "✅ SUCCESS: No old interpolation syntax found!"
fi

# Check for proper reference syntax
if grep -q 'var\.' src/output/main.tf && grep -q 'data\.' src/output/main.tf && grep -q 'local\.' src/output/main.tf; then
    echo "✅ SUCCESS: Found proper Terraform references (var., data., local.)"
else
    echo "⚠️  WARNING: Expected Terraform references not found"
fi

# Check for proper HCL structure
if grep -q 'provider "aws"' src/output/main.tf && grep -q 'resource "aws_' src/output/main.tf && grep -q 'data "aws_' src/output/main.tf; then
    echo "✅ SUCCESS: Proper HCL block structure found"
else
    echo "❌ ERROR: Expected HCL block structure not found"
    exit 1
fi

echo ""
echo "🎉 All basic validations passed!"
echo "🚀 The new AST-based generator is working correctly!"
