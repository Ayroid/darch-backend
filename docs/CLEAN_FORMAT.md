# Clean Architecture Data Format

This document describes the new clean architecture data format that provides a more structured and comprehensive way to define cloud infrastructure architectures.

## Overview

The clean format organizes architecture data into three main sections:
- **Metadata**: Project information and provider configuration
- **Infrastructure**: Resource specifications organized by category
- **Deployment**: Terraform configuration and dependencies

## Benefits of Clean Format

1. **Better Organization**: Resources grouped by logical categories (network, compute, security, etc.)
2. **More Comprehensive**: Supports more AWS resource types and configurations
3. **Easier Validation**: Clear structure makes validation more straightforward
4. **Better Documentation**: Self-documenting with clear property names
5. **Type Safety**: Strong TypeScript interfaces for better development experience

## Format Structure

```typescript
interface CleanArchitectureData {
  metadata: ProjectMetadata;
  infrastructure: InfrastructureSpec;
  deployment: DeploymentConfig;
}
```

## Example Clean Format

```json
{
  "metadata": {
    "name": "Simple VPC with EC2",
    "description": "Basic infrastructure with VPC, subnets, security group, and EC2 instances",
    "version": "1.0.0",
    "provider": {
      "name": "aws",
      "region": "us-east-1"
    },
    "environment": "development",
    "project": "simple-infrastructure",
    "createdAt": "2025-09-08T17:00:00.000Z",
    "lastModified": "2025-09-08T17:56:00.000Z",
    "tags": {
      "Environment": "development",
      "Project": "simple-infrastructure",
      "ManagedBy": "Darch"
    }
  },
  "infrastructure": {
    "network": {
      "vpc": {
        "id": "main-vpc",
        "name": "main-vpc",
        "cidr_block": "10.0.0.0/16",
        "enable_dns_hostnames": true,
        "enable_dns_support": true,
        "tags": {
          "Name": "main-vpc",
          "Environment": "development"
        }
      },
      "subnets": [
        {
          "id": "private-subnet",
          "name": "private-subnet",
          "vpc_id": "main-vpc",
          "cidr_block": "10.0.1.0/24",
          "availability_zone": "us-east-1a",
          "type": "private",
          "map_public_ip_on_launch": false,
          "tags": {
            "Name": "private-subnet",
            "Type": "Private"
          }
        },
        {
          "id": "public-subnet",
          "name": "public-subnet",
          "vpc_id": "main-vpc",
          "cidr_block": "10.0.2.0/24",
          "availability_zone": "us-east-1a",
          "type": "public",
          "map_public_ip_on_launch": true,
          "tags": {
            "Name": "public-subnet",
            "Type": "Public"
          }
        }
      ]
    },
    "compute": {
      "instances": [
        {
          "id": "private-ec2",
          "name": "private-instance",
          "instance_type": "t3.micro",
          "ami_id": "ami-0c55b159cbfafe1d0",
          "subnet_id": "private-subnet",
          "security_group_ids": ["web-security-group"],
          "associate_public_ip_address": false,
          "root_block_device": {
            "volume_type": "gp3",
            "volume_size": 8,
            "delete_on_termination": true,
            "encrypted": false
          },
          "ebs_block_devices": [],
          "tags": {
            "Name": "private-instance",
            "Environment": "development"
          }
        },
        {
          "id": "public-ec2",
          "name": "public-instance",
          "instance_type": "t3.micro",
          "ami_id": "ami-0c55b159cbfafe1d0",
          "subnet_id": "public-subnet",
          "security_group_ids": ["web-security-group"],
          "associate_public_ip_address": true,
          "root_block_device": {
            "volume_type": "gp3",
            "volume_size": 8,
            "delete_on_termination": true,
            "encrypted": false
          },
          "ebs_block_devices": [],
          "tags": {
            "Name": "public-instance",
            "Environment": "development"
          }
        }
      ]
    },
    "storage": {
      "s3_buckets": []
    },
    "security": {
      "security_groups": [
        {
          "id": "web-security-group",
          "name": "web-sg",
          "description": "Security group for web servers",
          "vpc_id": "main-vpc",
          "ingress_rules": [
            {
              "from_port": 80,
              "to_port": 80,
              "protocol": "tcp",
              "cidr_blocks": ["0.0.0.0/0"],
              "description": "HTTP access"
            },
            {
              "from_port": 443,
              "to_port": 443,
              "protocol": "tcp",
              "cidr_blocks": ["0.0.0.0/0"],
              "description": "HTTPS access"
            },
            {
              "from_port": 22,
              "to_port": 22,
              "protocol": "tcp",
              "cidr_blocks": ["10.0.0.0/16"],
              "description": "SSH access from VPC"
            }
          ],
          "egress_rules": [
            {
              "from_port": 0,
              "to_port": 0,
              "protocol": "-1",
              "cidr_blocks": ["0.0.0.0/0"],
              "description": "All outbound traffic"
            }
          ],
          "tags": {
            "Name": "web-security-group"
          }
        }
      ]
    }
  },
  "deployment": {
    "terraform": {
      "version": "~> 1.0",
      "required_providers": {
        "aws": {
          "source": "hashicorp/aws",
          "version": "~> 5.0"
        }
      }
    },
    "dependencies": [
      {
        "source": "main-vpc",
        "target": "private-subnet",
        "type": "explicit",
        "relationship": "contains"
      },
      {
        "source": "main-vpc",
        "target": "public-subnet",
        "type": "explicit",
        "relationship": "contains"
      },
      {
        "source": "main-vpc",
        "target": "web-security-group",
        "type": "explicit",
        "relationship": "contains"
      },
      {
        "source": "private-subnet",
        "target": "private-ec2",
        "type": "explicit",
        "relationship": "contains"
      },
      {
        "source": "public-subnet",
        "target": "public-ec2",
        "type": "explicit",
        "relationship": "contains"
      },
      {
        "source": "web-security-group",
        "target": "private-ec2",
        "type": "explicit",
        "relationship": "secures"
      },
      {
        "source": "web-security-group",
        "target": "public-ec2",
        "type": "explicit",
        "relationship": "secures"
      }
    ],
    "strategy": {
      "type": "single",
      "rollback_on_failure": true,
      "timeout": 3600
    }
  }
}
```

## Infrastructure Categories

### Network Configuration
- **VPC**: Virtual Private Cloud configuration
- **Subnets**: Public, private, and database subnets
- **Route Tables**: Custom routing configurations
- **Internet/NAT Gateways**: Internet connectivity

### Compute Configuration
- **EC2 Instances**: Virtual machine configurations
- **Launch Templates**: Reusable instance configurations
- **Auto Scaling Groups**: Scalable instance groups

### Storage Configuration
- **S3 Buckets**: Object storage with encryption and lifecycle policies
- **EFS**: Elastic File Systems
- **EBS Volumes**: Block storage volumes

### Security Configuration
- **Security Groups**: Firewall rules
- **NACLs**: Network Access Control Lists
- **IAM Roles**: Identity and Access Management
- **KMS Keys**: Encryption key management

### Database Configuration
- **RDS**: Relational database instances
- **Aurora**: Aurora clusters and instances
- **DynamoDB**: NoSQL tables and indexes

### Load Balancer Configuration
- **Application/Network/Gateway**: Load balancer types
- **Listeners**: Traffic routing rules
- **Target Groups**: Backend instance groups

## API Endpoints

### Using Clean Format

```bash
# Generate Terraform with clean format
curl -X POST http://localhost:3001/api/generate-terraform \
  -H "Content-Type: application/json" \
  -d @clean-architecture-data.json
```

### Convert Legacy to Clean

```bash
# Convert legacy format to clean format
curl -X POST http://localhost:3001/api/convert/to-clean \
  -H "Content-Type: application/json" \
  -d @legacy-architecture-data.json
```

### Get Clean Format Example

```bash
# Get example clean format data
curl http://localhost:3001/api/examples/clean-format
```

## Migration Guide

### From Legacy Format

1. **Use the conversion endpoint** to automatically convert existing architecture data
2. **Review the converted data** for any missing configurations
3. **Test the conversion** by generating Terraform and validating the output
4. **Update your frontend** to use the clean format (optional - both formats are supported)

### Key Differences

| Legacy Format | Clean Format |
|---------------|------------- |
| Flat node structure | Organized by resource category |
| Position-based layout | Logic-based organization |
| Mixed configuration levels | Consistent configuration hierarchy |
| Limited resource support | Comprehensive resource coverage |
| Basic validation | Advanced validation rules |

## Validation

The clean format includes comprehensive validation:

- **Structure validation**: Ensures all required sections are present
- **CIDR validation**: Validates network CIDR blocks
- **Dependency validation**: Checks for circular dependencies
- **Resource validation**: Validates resource-specific configurations
- **Security validation**: Identifies potential security issues

## Benefits for Development

1. **Type Safety**: Strong TypeScript interfaces prevent runtime errors
2. **IDE Support**: Better autocomplete and IntelliSense
3. **Documentation**: Self-documenting structure
4. **Maintainability**: Easier to extend with new resource types
5. **Testing**: Easier to write unit tests for specific components

## Future Enhancements

- Support for multi-region deployments
- Advanced networking features (VPC peering, transit gateways)
- Container services (ECS, EKS)
- Serverless resources (Lambda, API Gateway)
- Monitoring and logging configurations
- Cost optimization recommendations

## Examples

See the `/examples` directory for more complete examples of different architecture patterns using the clean format.
