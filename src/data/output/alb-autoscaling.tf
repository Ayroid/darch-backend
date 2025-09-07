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

resource "aws_lb" "app_lb" {
  name = "app-lb"
  internal = false
  load_balancer_type = "application"
  subnets = [aws_subnet.public.id]
}

resource "aws_autoscaling_group" "asg" {
  launch_configuration = aws_launch_configuration.as_conf.id
  min_size = 1
  max_size = 3
  vpc_zone_identifier = [aws_subnet.public.id]
}

resource "aws_launch_configuration" "as_conf" {
  image_id = "ami-0c02fb55956c7d316"
  instance_type = "t3.micro"
}

resource "aws_subnet" "public" {
  vpc_id = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
  map_public_ip_on_launch = true
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}