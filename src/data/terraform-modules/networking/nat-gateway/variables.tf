variable "name" {
  description = "Name of the NAT Gateway"
  type        = string
}

variable "subnet_id" {
  description = "ID of the subnet in which to place the NAT Gateway (must be a public subnet)"
  type        = string
}

variable "connectivity_type" {
  description = "Connectivity type for the NAT Gateway. Valid values are 'private' and 'public'"
  type        = string
  default     = "public"

  validation {
    condition     = contains(["private", "public"], var.connectivity_type)
    error_message = "Connectivity type must be either 'private' or 'public'."
  }
}

variable "allocation_id" {
  description = "The Allocation ID of the Elastic IP address for the NAT Gateway. Required for connectivity_type of public"
  type        = string
  default     = null
}

variable "private_ip" {
  description = "The private IPv4 address to assign to the NAT Gateway"
  type        = string
  default     = null
}

variable "create_eip" {
  description = "Whether to create an Elastic IP for the NAT Gateway (only applies to public NAT Gateway)"
  type        = bool
  default     = true
}

variable "tags" {
  description = "A map of tags to assign to the NAT Gateway"
  type        = map(string)
  default     = {}
}

variable "region" {
  description = "AWS region where the NAT Gateway will be created"
  type        = string
  default     = "us-east-1"
}
