# Generated Terraform Configuration

# Best Practices:
# - Use 'terraform fmt' and 'terraform validate' before applying.
# - Use remote state for team environments.
# - Never hardcode credentials or AMI IDs.
# - Restrict security group rules.
# - Use modules for reusable patterns.

provider "aws" {
  region = "us-east-1"
  version = "~> 5.0"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private" {
  vpc_id = aws_vpc.main.id
  cidr_block = "10.0.2.0/24"
}