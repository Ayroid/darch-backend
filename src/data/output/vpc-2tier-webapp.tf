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

variable "environment" {
  description = "Environment name"
  type = string
  default = "dev"
}

variable "instance_type" {
  description = "EC2 instance type"
  type = string
  default = "t3.micro"
}

locals {
  common_tags = {
    Environment = var.environment
    Project = "WebApp"
    ManagedBy = "Terraform"
  }
  name_prefix = var.environment
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_security_group" "default" {
  filter {
    name = "group-name"
    values = ["default"]
  }
  filter {
    name = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "web" {
  name = local.name_prefix
  description = "Security group for web servers"
  vpc_id = data.aws_vpc.default.id
  ingress {
    description = "HTTP"
    from_port = 80
    to_port = 80
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTPS"
    from_port = 443
    to_port = 443
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "SSH"
    from_port = 22
    to_port = 22
    protocol = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = local.common_tags
}

resource "aws_instance" "web_server_1" {
  ami = "ami-0c02fb55956c7d316"
  instance_type = var.instance_type
  subnet_id = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.web.id]
  associate_public_ip_address = true
  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    yum install -y httpd
    systemctl start httpd
    systemctl enable httpd
    echo '<h1>Web Server 1</h1>' > /var/www/html/index.html
    EOF
  tags = {
    Name = local.name_prefix
    Environment = var.environment
    Role = "WebServer"
  }
  # ami_warning = "# WARNING: Hardcoded AMI. Use a data source for latest AMI."
}

resource "aws_instance" "web_server_2" {
  ami = "ami-0c02fb55956c7d316"
  instance_type = var.instance_type
  subnet_id = data.aws_subnets.default.ids[1]
  vpc_security_group_ids = [aws_security_group.web.id]
  associate_public_ip_address = true
  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    yum install -y httpd
    systemctl start httpd
    systemctl enable httpd
    echo '<h1>Web Server 2</h1>' > /var/www/html/index.html
    EOF
  tags = {
    Name = local.name_prefix
    Environment = var.environment
    Role = "WebServer"
  }
  # ami_warning = "# WARNING: Hardcoded AMI. Use a data source for latest AMI."
}

output "vpc_id" {
  description = "ID of the VPC"
  value = data.aws_vpc.default.id
}

output "web_server_1_ip" {
  description = "Public IP of web server 1"
  value = aws_instance.web_server_1.public_ip
}

output "web_server_2_ip" {
  description = "Public IP of web server 2"
  value = aws_instance.web_server_2.public_ip
}

output "security_group_id" {
  description = "ID of the web security group"
  value = aws_security_group.web.id
}