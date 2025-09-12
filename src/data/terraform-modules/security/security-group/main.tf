resource "aws_security_group" "this" {
  name                   = var.name
  description            = var.description
  vpc_id                 = var.vpc_id
  revoke_rules_on_delete = var.revoke_rules_on_delete

  tags = merge(
    var.tags,
    {
      Name = var.name
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "ingress" {
  count = length(var.ingress_rules)

  type              = "ingress"
  from_port         = var.ingress_rules[count.index].from_port
  to_port           = var.ingress_rules[count.index].to_port
  protocol          = var.ingress_rules[count.index].protocol
  cidr_blocks       = var.ingress_rules[count.index].cidr_blocks
  ipv6_cidr_blocks  = var.ingress_rules[count.index].ipv6_cidr_blocks
  source_security_group_id = length(var.ingress_rules[count.index].security_groups) > 0 ? var.ingress_rules[count.index].security_groups[0] : null
  self              = var.ingress_rules[count.index].self
  description       = var.ingress_rules[count.index].description
  security_group_id = aws_security_group.this.id
}

resource "aws_security_group_rule" "egress" {
  count = var.create_default_egress_rule ? length(var.egress_rules) : 0

  type                     = "egress"
  from_port                = var.egress_rules[count.index].from_port
  to_port                  = var.egress_rules[count.index].to_port
  protocol                 = var.egress_rules[count.index].protocol
  cidr_blocks              = var.egress_rules[count.index].cidr_blocks
  ipv6_cidr_blocks         = var.egress_rules[count.index].ipv6_cidr_blocks
  source_security_group_id = length(var.egress_rules[count.index].security_groups) > 0 ? var.egress_rules[count.index].security_groups[0] : null
  self                     = var.egress_rules[count.index].self
  description              = var.egress_rules[count.index].description
  security_group_id        = aws_security_group.this.id
}
