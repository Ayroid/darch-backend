resource "aws_security_group" "project_security_group" {
  vpc_id = var.aws_vpc_id
  dynamic "ingress" {
    for_each = var.aws_security_group_ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }

  dynamic "egress" {
    for_each = var.aws_security_group_egress_rules
    content {
      from_port   = egress.value.from_port
      to_port     = egress.value.to_port
      protocol    = egress.value.protocol
      cidr_blocks = egress.value.cidr_blocks
    }
  }

  tags = {
    Name = var.aws_security_group_name
  }
}

resource "aws_key_pair" "project_key_pair" {
  key_name   = var.aws_key_pair_name
  public_key = file(var.aws_key_pair_public_key_file)
}

data "aws_ami" "project_aws_ami" {
  count       = 1
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "project_ec2_instance" {
  ami                         = data.aws_ami.project_aws_ami[0].id
  instance_type               = var.aws_instance_type
  subnet_id                   = var.aws_subnet_id
  key_name                    = var.aws_key_pair_name
  vpc_security_group_ids      = [aws_security_group.project_security_group.id]
  associate_public_ip_address = true
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    encrypted             = true  # Enable encryption
    delete_on_termination = true

    tags = {
      Name = "${var.aws_instance_name}-root-volume"
    }
  }
  tags = {
    Name = var.aws_instance_name
  }
}
