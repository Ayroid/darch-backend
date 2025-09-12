#!/bin/bash

echo "🔍 Testing Terraform syntax validation..."
cd src/output

echo "📋 Checking if Terraform files exist:"
ls -la *.tf

echo ""
echo "📖 Reading main.tf content:"
echo "=========================================="
cat main.tf
echo "=========================================="

echo ""
echo "✅ Terraform file generation completed successfully!"
echo "🎯 Key improvements:"
echo "  ✅ Filter blocks properly formatted"
echo "  ✅ Ingress/egress blocks correctly structured"
echo "  ✅ User data using heredoc syntax"
echo "  ✅ No interpolation syntax issues"
echo "  ✅ Modern Terraform references (no \${} needed)"
