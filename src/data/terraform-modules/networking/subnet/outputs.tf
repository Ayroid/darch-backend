output "subnet_id" {
  description = "The ID of the subnet"
  value       = aws_subnet.this.id
}

output "subnet_arn" {
  description = "The ARN of the subnet"
  value       = aws_subnet.this.arn
}

output "subnet_cidr_block" {
  description = "The CIDR block of the subnet"
  value       = aws_subnet.this.cidr_block
}

output "subnet_availability_zone" {
  description = "The AZ of the subnet"
  value       = aws_subnet.this.availability_zone
}

output "route_table_id" {
  description = "The ID of the subnet route table"
  value       = try(aws_route_table.this[0].id, null)
}

output "route_table_association_id" {
  description = "The ID of the subnet route table association"
  value       = try(aws_route_table_association.this[0].id, null)
}
