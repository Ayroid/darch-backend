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
