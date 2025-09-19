variable "vpc_id" {
  description = "The ID of the VPC to attach the Internet Gateway to"
  type        = string
}

variable "name" {
  description = "Name tag for the Internet Gateway"
  type        = string
  default     = "main-igw"
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}

variable "create_default_route" {
  description = "Whether to create a default route (0.0.0.0/0) to the Internet Gateway"
  type        = bool
  default     = false
}

variable "route_table_id" {
  description = "Route table ID to add the default route to (required if create_default_route is true)"
  type        = string
  default     = ""
}
