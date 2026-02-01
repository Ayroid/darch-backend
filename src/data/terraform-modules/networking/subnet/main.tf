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

# Local values to control route creation
# Only create routes if the gateway ID is actually provided (not null or empty)
locals {
  create_igw_route = var.subnet_type == "public" && var.create_route_table && var.create_igw_route && var.internet_gateway_id != null && var.internet_gateway_id != ""
  create_nat_route = var.subnet_type == "private" && var.create_route_table && var.create_nat_route && var.nat_gateway_id != null && var.nat_gateway_id != ""
}

# Route to internet gateway for public subnets
resource "aws_route" "internet_gateway" {
  for_each = local.create_igw_route ? toset(["default"]) : toset([])

  route_table_id         = aws_route_table.this[0].id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = var.internet_gateway_id

  depends_on = [aws_route_table.this]
}

# Route to NAT gateway for private subnets
resource "aws_route" "nat_gateway" {
  for_each = local.create_nat_route ? toset(["default"]) : toset([])

  route_table_id         = aws_route_table.this[0].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = var.nat_gateway_id

  depends_on = [aws_route_table.this]
}
