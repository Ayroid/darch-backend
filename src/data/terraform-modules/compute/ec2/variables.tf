variable "name" {
  description = "Name to be used on all the resources as identifier"
  type        = string
  default     = "ec2-instance"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"

  validation {
    condition = contains([
      "t3.micro", "t3.small", "t3.medium", "t3.large", "t3.xlarge", "t3.2xlarge",
      "t2.micro", "t2.small", "t2.medium", "t2.large", "t2.xlarge", "t2.2xlarge",
      "m5.large", "m5.xlarge", "m5.2xlarge", "m5.4xlarge", "m5.8xlarge", "m5.12xlarge",
      "c5.large", "c5.xlarge", "c5.2xlarge", "c5.4xlarge", "c5.9xlarge", "c5.12xlarge",
      "r5.large", "r5.xlarge", "r5.2xlarge", "r5.4xlarge", "r5.8xlarge", "r5.12xlarge"
    ], var.instance_type)
    error_message = "Instance type must be a valid EC2 instance type."
  }
}

variable "ami_id" {
  description = "The AMI ID to use for the instance. If not provided or null, will automatically use the latest Amazon Linux 2023 AMI for the region."
  type        = string
  default     = null
}

variable "subnet_id" {
  description = "Subnet ID where EC2 will be launched"
  type        = string
}

variable "security_group_ids" {
  description = "List of security group IDs to assign to the instance"
  type        = list(string)
  default     = []
}

variable "key_name" {
  description = "The key pair name to use for the instance"
  type        = string
  default     = null
}

variable "user_data" {
  description = "User data script to run on instance launch"
  type        = string
  default     = null
}

variable "iam_instance_profile" {
  description = "The IAM Instance Profile to launch the instance with"
  type        = string
  default     = null
}

variable "ebs_optimized" {
  description = "If true, the launched EC2 instance will be EBS-optimized"
  type        = bool
  default     = false
}

variable "monitoring" {
  description = "If true, the launched EC2 instance will have detailed monitoring enabled"
  type        = bool
  default     = false
}

variable "disable_api_termination" {
  description = "If true, enables EC2 Instance Termination Protection"
  type        = bool
  default     = false
}

variable "associate_public_ip_address" {
  description = "Whether to associate a public IP address with an instance in a VPC"
  type        = bool
  default     = null
}

variable "root_block_device" {
  description = "Configuration block to customize details about the root block device of the instance"
  type = object({
    volume_type           = optional(string, "gp3")
    volume_size           = optional(number, 8)
    encrypted             = optional(bool, true)
    iops                  = optional(number)
    throughput            = optional(number)
    delete_on_termination = optional(bool, true)
  })
  default = {
    volume_type           = "gp3"
    volume_size           = 8
    encrypted             = true
    delete_on_termination = true
  }
}

variable "ebs_block_device" {
  description = "Additional EBS block devices to attach to the instance"
  type = list(object({
    device_name           = string
    volume_type           = optional(string, "gp3")
    volume_size           = number
    encrypted             = optional(bool, true)
    iops                  = optional(number)
    throughput            = optional(number)
    delete_on_termination = optional(bool, true)
  }))
  default = []
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}

variable "volume_tags" {
  description = "A map of tags to assign to the devices created by the instance at launch time"
  type        = map(string)
  default     = {}
}
