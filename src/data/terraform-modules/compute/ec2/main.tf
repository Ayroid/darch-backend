terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# Get the latest Amazon Linux 2 AMI if no AMI ID is provided
data "aws_ami" "amazon_linux" {
  count = var.ami_id == null ? 1 : 0

  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "this" {
  ami                         = var.ami_id != null ? var.ami_id : data.aws_ami.amazon_linux[0].id
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = var.security_group_ids
  key_name                    = var.key_name
  user_data                   = var.user_data
  iam_instance_profile        = var.iam_instance_profile
  ebs_optimized              = var.ebs_optimized
  monitoring                 = var.monitoring
  disable_api_termination    = var.disable_api_termination
  associate_public_ip_address = var.associate_public_ip_address

  dynamic "root_block_device" {
    for_each = var.root_block_device != null ? [var.root_block_device] : []
    content {
      volume_type = root_block_device.value.volume_type
      volume_size = root_block_device.value.volume_size
      encrypted   = root_block_device.value.encrypted
      iops        = root_block_device.value.iops
      throughput  = root_block_device.value.throughput
      tags = merge(
        var.volume_tags,
        {
          Name = "${var.name}-root"
        }
      )
    }
  }

  dynamic "ebs_block_device" {
    for_each = var.ebs_block_device
    content {
      device_name = ebs_block_device.value.device_name
      volume_type = ebs_block_device.value.volume_type
      volume_size = ebs_block_device.value.volume_size
      encrypted   = ebs_block_device.value.encrypted
      iops        = ebs_block_device.value.iops
      throughput  = ebs_block_device.value.throughput
      tags = merge(
        var.volume_tags,
        {
          Name = "${var.name}-${ebs_block_device.value.device_name}"
        }
      )
    }
  }

  tags = merge(
    var.tags,
    {
      Name = var.name
    }
  )

  lifecycle {
    ignore_changes = [ami]
  }
}
