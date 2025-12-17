variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "deployment_env_prefix" {
  description = "Deployment Environment Prefix"
}

variable "aws_vpc_name" {
  description = "VPC Name"
  type        = string
  default     = "dev_vpc"
}

variable "aws_vpc_cidr_block" {
  description = "VPC CIDR Block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "aws_subnet_cidr_block" {
  description = "Subnet CIDR Block"
  type        = string
  default     = "10.0.1.0/24"
}

variable "aws_availability_zone" {
  description = "AWS Availability Zone"
  type        = string
  default     = "us-east-1a"
}

variable "aws_subnet_name" {
  description = "Subnet Name"
  type        = string
  default     = "dev_subnet"
}

variable "aws_internet_gateway_name" {
  description = "Internet Gateway Name"
  type        = string
  default     = "dev_internet_gateway"
}

variable "aws_route_table_name" {
  description = "Route Table Name"
  type        = string
  default     = "dev_route_table"
}

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