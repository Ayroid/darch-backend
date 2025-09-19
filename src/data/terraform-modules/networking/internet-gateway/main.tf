# Internet Gateway Resource
resource "aws_internet_gateway" "this" {
  vpc_id = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = var.name
      Type = "internet-gateway"
    }
  )
}

# Optional: Default route for public subnets
resource "aws_route" "internet_access" {
  count = var.create_default_route ? 1 : 0
  
  route_table_id         = var.route_table_id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this.id
}
