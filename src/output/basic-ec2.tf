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

data "aws_vpc" "default" {
  default = true
}

data "aws_subnet_ids" "default" {
  vpc_id = data.aws_vpc.default.id
}

data "aws_security_group" "default" {
  filter {
    name = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  most_recent = true
}

resource "aws_instance" "web_server_1" {
  ami = "ami-0c02fb55956c7d316"
  instance_type = "t2.micro"
  subnet_id = "${data.aws_subnet_ids.default.ids[0]}"
  vpc_security_group_ids = [data.aws_security_group.default.id]
  associate_public_ip_address = true
  tags = {
    Name = "Web Server 1"
    Environment = "dev"
  }
  # ami_warning = "# WARNING: Hardcoded AMI. Use a data source for latest AMI."
}

resource "aws_instance" "web_server_2" {
  ami = "ami-0c02fb55956c7d316"
  instance_type = "t2.micro"
  subnet_id = "${data.aws_subnet_ids.default.ids[0]}"
  vpc_security_group_ids = [data.aws_security_group.default.id]
  associate_public_ip_address = true
  tags = {
    Name = "Web Server 2"
    Environment = "dev"
  }
  # ami_warning = "# WARNING: Hardcoded AMI. Use a data source for latest AMI."
}

output "instance_1_public_ip" {
  value = aws_instance.web_server_1.public_ip
}

output "instance_2_public_ip" {
  value = aws_instance.web_server_2.public_ip
}