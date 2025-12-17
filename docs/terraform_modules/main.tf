module "custom_vpc" {
  source = "./modules/vpc"

  aws_vpc_cidr_block        = var.aws_vpc_cidr_block
  aws_vpc_name              = var.aws_vpc_name
  aws_subnet_cidr_block     = var.aws_subnet_cidr_block
  aws_subnet_name           = var.aws_subnet_name
  aws_availability_zone     = var.aws_availability_zone
  aws_internet_gateway_name = var.aws_internet_gateway_name
  aws_route_table_name      = var.aws_route_table_name
}

module "custom_ec2_instance" {
  source = "./modules/ec2_instance"

  aws_security_group_ingress_rules = var.aws_security_group_ingress_rules
  aws_security_group_egress_rules  = var.aws_security_group_egress_rules
  aws_security_group_name          = var.aws_security_group_name
  aws_key_pair_name                = var.aws_key_pair_name
  aws_key_pair_public_key_file     = var.aws_key_pair_public_key_file
  aws_instance_type                = var.aws_instance_type
  aws_instance_name                = var.aws_instance_name
  aws_subnet_id                    = module.custom_vpc.aws_subnet_id
  aws_vpc_id                       = module.custom_vpc.aws_vpc_id
}
