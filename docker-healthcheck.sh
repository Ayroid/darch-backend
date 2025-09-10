#!/bin/bash
# Health check script for Docker container

# Check if the application is responding on port 5000
curl -f http://localhost:5000/health || exit 1

# Check if Terraform is available
terraform version > /dev/null 2>&1 || exit 1

echo "Health check passed"
exit 0
