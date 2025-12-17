output "ec2_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = module.custom_ec2_instance.aws_instance_public_ip
}