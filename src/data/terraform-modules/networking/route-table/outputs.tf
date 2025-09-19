output "route_table_id" {
  description = "The ID of the route table"
  value       = aws_route_table.this.id
}

output "route_table_arn" {
  description = "The ARN of the route table"
  value       = aws_route_table.this.arn
}

output "vpc_id" {
  description = "The VPC ID"
  value       = aws_route_table.this.vpc_id
}

output "route_table_owner_id" {
  description = "The ID of the AWS account that owns the route table"
  value       = aws_route_table.this.owner_id
}

output "routes" {
  description = "Map of route configurations"
  value       = aws_route.routes
}

output "associations" {
  description = "Map of route table associations"
  value       = aws_route_table_association.associations
}
