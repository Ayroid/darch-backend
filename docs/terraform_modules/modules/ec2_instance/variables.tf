variable "aws_security_group_ingress_rules" {
  description = "Security Group Ingress Rules"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = [
    {
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = ["182.77.77.0/32"]
    },
    {
      from_port   = 5000
      to_port     = 5000
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]
}

variable "aws_security_group_egress_rules" {
  description = "Security Group Egress Rules"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = [
    {
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]
}

variable "aws_security_group_name" {
  description = "Security Group Name"
  type        = string
  default     = "dev_security_group"
}

variable "aws_key_pair_name" {
  description = "AWS Key Pair Name"
  type        = string
  default     = "my_key_pair"
}

variable "aws_key_pair_public_key_file" {
  description = "AWS Key Pair Public Key"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "aws_instance_type" {
  description = "EC2 Instance Type"
  type        = string
  default     = "t2.micro"
}

variable "aws_instance_name" {
  description = "EC2 Instance Name"
  type        = string
  default     = "dev_ec2_instance"
}

variable "aws_subnet_id" {
  description = "The ID of the subnet to launch the EC2 instance in"
  type        = string
}

variable "aws_vpc_id" {
  description = "The ID of the VPC where the security group will be created"
  type        = string
}