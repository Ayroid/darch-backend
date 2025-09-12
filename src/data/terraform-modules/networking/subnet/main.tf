resource "aws_subnet" "this" {
  vpc_id                  = var.vpc_id
  cidr_block              = var.cidr_block
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = var.map_public_ip_on_launch

  tags = merge(
    var.tags,
    {
      Name = var.name
      Type = var.subnet_type
    }
  )
}

# Route table for the subnet
resource "aws_route_table" "this" {
  count = var.create_route_table ? 1 : 0

  vpc_id = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-rt"
      Type = var.subnet_type
    }
  )
}

# Associate the route table with the subnet
resource "aws_route_table_association" "this" {
  count = var.create_route_table ? 1 : 0

  subnet_id      = aws_subnet.this.id
  route_table_id = aws_route_table.this[0].id
}

# Route to internet gateway for public subnets
resource "aws_route" "internet_gateway" {
  count = var.subnet_type == "public" && var.internet_gateway_id != null && var.create_route_table ? 1 : 0

  route_table_id         = aws_route_table.this[0].id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = var.internet_gateway_id
}

# Route to NAT gateway for private subnets
resource "aws_route" "nat_gateway" {
  count = var.subnet_type == "private" && var.nat_gateway_id != null && var.create_route_table ? 1 : 0

  route_table_id         = aws_route_table.this[0].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = var.nat_gateway_id
}
