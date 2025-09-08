output "instance_id" {
  description = "The ID of the instance"
  value       = aws_instance.this.id
}

output "instance_arn" {
  description = "The ARN of the instance"
  value       = aws_instance.this.arn
}

output "instance_state" {
  description = "The state of the instance"
  value       = aws_instance.this.instance_state
}

output "instance_type" {
  description = "The type of the instance"
  value       = aws_instance.this.instance_type
}

output "public_ip" {
  description = "The public IP address assigned to the instance"
  value       = aws_instance.this.public_ip
}

output "private_ip" {
  description = "The private IP address assigned to the instance"
  value       = aws_instance.this.private_ip
}

output "private_dns" {
  description = "The private DNS name assigned to the instance"
  value       = aws_instance.this.private_dns
}

output "public_dns" {
  description = "The public DNS name assigned to the instance"
  value       = aws_instance.this.public_dns
}

output "security_groups" {
  description = "The associated security groups"
  value       = aws_instance.this.security_groups
}

output "vpc_security_group_ids" {
  description = "The associated security groups in VPC"
  value       = aws_instance.this.vpc_security_group_ids
}

output "subnet_id" {
  description = "The VPC subnet ID"
  value       = aws_instance.this.subnet_id
}

output "availability_zone" {
  description = "The availability zone of the instance"
  value       = aws_instance.this.availability_zone
}
