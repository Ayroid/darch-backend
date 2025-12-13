# Create Elastic IP for public NAT Gateway if needed
resource "aws_eip" "nat" {
  count  = var.connectivity_type == "public" && var.create_eip && var.allocation_id == null ? 1 : 0
  domain = "vpc"

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-eip"
    }
  )
}

# Create NAT Gateway
resource "aws_nat_gateway" "main" {
  subnet_id         = var.subnet_id
  connectivity_type = var.connectivity_type

  # Use provided allocation_id or created EIP allocation_id for public NAT Gateway
  allocation_id = var.connectivity_type == "public" ? (
    var.allocation_id != null ? var.allocation_id : (
      length(aws_eip.nat) > 0 ? aws_eip.nat[0].id : null
    )
  ) : null

  # Private IP only for private connectivity type
  private_ip = var.connectivity_type == "private" ? var.private_ip : null

  tags = merge(
    var.tags,
    {
      Name = var.name
    }
  )

  # Ensure EIP is created before NAT Gateway if we're creating one
  depends_on = [aws_eip.nat]
}
