output "aws_subnet_id" {
  description = "The ID of the VPC subnet"
  value       = aws_subnet.project_subnet.id
}

output "aws_vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.project_vpc.id
}