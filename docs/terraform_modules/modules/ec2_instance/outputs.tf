output "aws_instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.project_ec2_instance.public_ip
}
