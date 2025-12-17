variable aws_vpc_cidr_block {
  description = "The CIDR block for the VPC"
  type        = string
}

variable aws_vpc_name {
  description = "The name of the VPC"
  type        = string
}

variable aws_subnet_cidr_block {
  description = "The CIDR block for the subnet"
  type        = string
}

variable aws_subnet_name {
  description = "The name of the subnet"
  type        = string
}

variable aws_availability_zone {
  description = "The availability zone for the subnet"
  type        = string
}

variable aws_internet_gateway_name {
  description = "The name of the internet gateway"
  type        = string
}

variable aws_route_table_name {
  description = "The name of the route table"
  type        = string
}
 