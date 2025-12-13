variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "name" {
  description = "Name tag for the route table"
  type        = string
  default     = "main-route-table"
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}

variable "routes" {
  description = "A map of route configurations"
  type = map(object({
    destination_cidr_block      = optional(string)
    destination_ipv6_cidr_block = optional(string)
    destination_prefix_list_id  = optional(string)
    carrier_gateway_id          = optional(string)
    core_network_arn           = optional(string)
    egress_only_gateway_id     = optional(string)
    gateway_id                 = optional(string)
    # instance_id removed - it's a computed attribute
    local_gateway_id           = optional(string)
    nat_gateway_id             = optional(string)
    network_interface_id       = optional(string)
    transit_gateway_id         = optional(string)
    vpc_endpoint_id            = optional(string)
    vpc_peering_connection_id  = optional(string)
  }))
  default = {}
}

variable "associations" {
  description = "A map of route table association configurations"
  type = map(object({
    subnet_id  = optional(string)
    gateway_id = optional(string)
  }))
  default = {}
}
