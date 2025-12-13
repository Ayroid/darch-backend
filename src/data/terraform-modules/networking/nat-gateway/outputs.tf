output "nat_gateway_id" {
  description = "The ID of the NAT Gateway"
  value       = aws_nat_gateway.main.id
}

output "nat_gateway_allocation_id" {
  description = "The Allocation ID of the Elastic IP address for the NAT Gateway"
  value       = aws_nat_gateway.main.allocation_id
}

output "nat_gateway_network_interface_id" {
  description = "The ENI ID of the network interface created by the NAT Gateway"
  value       = aws_nat_gateway.main.network_interface_id
}

output "nat_gateway_private_ip" {
  description = "The private IP address of the NAT Gateway"
  value       = aws_nat_gateway.main.private_ip
}

output "nat_gateway_public_ip" {
  description = "The public IP address of the NAT Gateway"
  value       = aws_nat_gateway.main.public_ip
}

output "elastic_ip_id" {
  description = "The ID of the Elastic IP created for the NAT Gateway (if created)"
  value       = length(aws_eip.nat) > 0 ? aws_eip.nat[0].id : null
}
