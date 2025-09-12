variable "name" {
  description = "Name to be used on all the resources as identifier"
  type        = string
  default     = "subnet"
}

variable "vpc_id" {
  description = "The VPC ID where the subnet will be created"
  type        = string
}

variable "cidr_block" {
  description = "The CIDR block for the subnet"
  type        = string

  validation {
    condition = can(cidrhost(var.cidr_block, 0))
    error_message = "CIDR block must be a valid IPv4 CIDR."
  }
}

variable "availability_zone" {
  description = "The AZ for the subnet"
  type        = string
}

variable "subnet_type" {
  description = "Type of subnet (public, private, or database)"
  type        = string
  default     = "private"

  validation {
    condition = contains(["public", "private", "database"], var.subnet_type)
    error_message = "Subnet type must be one of: public, private, database."
  }
}

variable "map_public_ip_on_launch" {
  description = "Should be false if you do not want to auto-assign public IP on launch"
  type        = bool
  default     = false
}

variable "create_route_table" {
  description = "Controls if a route table should be created for this subnet"
  type        = bool
  default     = true
}

variable "internet_gateway_id" {
  description = "The ID of the Internet Gateway (required for public subnets)"
  type        = string
  default     = null
}

variable "nat_gateway_id" {
  description = "The ID of the NAT Gateway (required for private subnets)"
  type        = string
  default     = null
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}
