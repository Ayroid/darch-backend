variable "name" {
  description = "Name of the security group"
  type        = string
}

variable "description" {
  description = "Description of the security group"
  type        = string
  default     = "Security group managed by Terraform"
}

variable "vpc_id" {
  description = "ID of the VPC where to create security group"
  type        = string
}

variable "ingress_rules" {
  description = "List of ingress rules to create"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = optional(list(string), [])
    ipv6_cidr_blocks = optional(list(string), [])
    security_groups = optional(list(string), [])
    self        = optional(bool, false)
    description = optional(string)
  }))
  default = []
}

variable "egress_rules" {
  description = "List of egress rules to create"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = optional(list(string), [])
    ipv6_cidr_blocks = optional(list(string), [])
    security_groups = optional(list(string), [])
    self        = optional(bool, false)
    description = optional(string)
  }))
  default = [
    {
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
      description = "Allow all outbound traffic"
    }
  ]
}

variable "create_default_egress_rule" {
  description = "Whether to create the default egress rule that allows all outbound traffic"
  type        = bool
  default     = true
}

variable "revoke_rules_on_delete" {
  description = "Instruct Terraform to revoke all of the Security Groups attached ingress and egress rules before deleting the rule itself"
  type        = bool
  default     = false
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}
