resource "aws_vpc" "project_vpc" {
  cidr_block       = var.aws_vpc_cidr_block
  instance_tenancy = "default"

  tags = {
    Name = var.aws_vpc_name
  }
}

resource "aws_subnet" "project_subnet" {
  vpc_id            = aws_vpc.project_vpc.id
  cidr_block        = var.aws_subnet_cidr_block
  availability_zone = var.aws_availability_zone

  tags = {
    Name = var.aws_subnet_name
  }
}

resource "aws_internet_gateway" "project_internet_gateway" {
  vpc_id = aws_vpc.project_vpc.id

  tags = {
    Name = var.aws_internet_gateway_name
  }
}

resource "aws_route_table" "project_route_table" {
  vpc_id = aws_vpc.project_vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.project_internet_gateway.id
  }

  tags = {
    Name = var.aws_route_table_name
  }
}

resource "aws_route_table_association" "project_route_table_association" {
  subnet_id      = aws_subnet.project_subnet.id
  route_table_id = aws_route_table.project_route_table.id
}