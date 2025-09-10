# Darch Backend JSON Format Specification

## Overview

The Darch backend accepts architecture data in JSON format for converting to Terraform files. The system supports two formats:

1. **Legacy Format** - Original node-based format (documented below)
2. **Clean Format** - New structured format for cleaner architecture definitions

## JSON Structure Rules

### 1. Root Object Structure

```json
{
  "architectureData": {
    // Required: Architecture definition
  },
  "projectName": "string" // Optional: Project name for generated files
}
```

### 2. Architecture Data Structure

#### Required Fields

```json
{
  "metadata": {
    // Project metadata - REQUIRED
  },
  "nodes": [
    // Array of infrastructure nodes - REQUIRED
  ],
  "connections": [
    // Array of node relationships - REQUIRED
  ],
  "variables": {
    // Terraform variables - OPTIONAL
  },
  "outputs": {
    // Terraform outputs - OPTIONAL
  }
}
```

### 3. Metadata Object (Required)

```json
{
  "metadata": {
    "name": "string",           // REQUIRED: Project name
    "description": "string",    // OPTIONAL: Project description
    "version": "string",        // REQUIRED: Version (semantic versioning)
    "provider": "string",       // REQUIRED: Cloud provider ("aws", "azure", "gcp")
    "region": "string",         // OPTIONAL: Default region (e.g., "us-east-1")
    "environment": "string",    // OPTIONAL: Environment ("dev", "staging", "prod")
    "project": "string",        // OPTIONAL: Project identifier
    "createdAt": "string",      // REQUIRED: ISO 8601 timestamp
    "lastModified": "string",   // REQUIRED: ISO 8601 timestamp
    "tags": {                   // OPTIONAL: Key-value tags
      "key": "value"
    }
  }
}
```

### 4. Nodes Array (Required)

Each node represents an infrastructure resource:

```json
{
  "id": "string",              // REQUIRED: Unique identifier
  "resourceType": "string",    // REQUIRED: AWS resource type (see supported types)
  "name": "string",           // REQUIRED: Display name
  "nodeType": "string",       // REQUIRED: "awsService" or "awsContainer"
  "position": {               // REQUIRED: UI positioning
    "x": number,
    "y": number
  },
  "dimensions": {             // OPTIONAL: UI dimensions
    "width": number,
    "height": number
  },
  "configuration": {          // REQUIRED: Resource-specific configuration
    // Varies by resource type
  },
  "parentId": "string"        // OPTIONAL: Parent container ID
}
```

#### Supported Resource Types

##### Networking
- `vpc` - Virtual Private Cloud
- `subnet` - Subnet (public/private)
- `internet-gateway` - Internet Gateway
- `nat-gateway` - NAT Gateway
- `route-table` - Route Table

##### Compute
- `ec2` - EC2 Instance
- `auto-scaling-group` - Auto Scaling Group
- `launch-template` - Launch Template

##### Security
- `security-group` - Security Group
- `nacl` - Network ACL

##### Storage
- `s3` - S3 Bucket
- `ebs` - EBS Volume
- `efs` - EFS File System

##### Database
- `rds` - RDS Instance
- `aurora` - Aurora Cluster
- `dynamodb` - DynamoDB Table

##### Load Balancing
- `application-load-balancer` - Application Load Balancer
- `network-load-balancer` - Network Load Balancer
- `target-group` - Target Group

#### Container Types (Optional)
- `aws-region` - Region container
- `aws-availability-zone` - AZ container

### 5. Configuration Objects by Resource Type

#### VPC Configuration
```json
{
  "configuration": {
    "cidr_block": "10.0.0.0/16",           // REQUIRED: CIDR notation
    "enable_dns_hostnames": true,           // OPTIONAL: Boolean (default: true)
    "enable_dns_support": true,             // OPTIONAL: Boolean (default: true)
    "tags": {                               // OPTIONAL: Resource tags
      "Name": "vpc-name",
      "Environment": "production"
    }
  }
}
```

#### Subnet Configuration
```json
{
  "configuration": {
    "vpc_id": "vpc-id",                     // REQUIRED: Parent VPC ID
    "cidr_block": "10.0.1.0/24",          // REQUIRED: CIDR notation
    "availability_zone": "us-east-1a",     // REQUIRED: AZ identifier
    "subnet_type": "public|private",        // OPTIONAL: Subnet type
    "map_public_ip_on_launch": true,       // OPTIONAL: Boolean
    "tags": {                              // OPTIONAL: Resource tags
      "Name": "subnet-name",
      "Type": "Public"
    }
  }
}
```

#### EC2 Instance Configuration
```json
{
  "configuration": {
    "instance_type": "t3.micro",           // REQUIRED: Instance type
    "ami_id": "ami-12345678",              // REQUIRED: AMI ID
    "key_pair": "key-name",                // OPTIONAL: Key pair name
    "subnet_id": "subnet-id",              // REQUIRED: Subnet ID
    "security_group_ids": ["sg-id"],       // REQUIRED: Array of SG IDs
    "associate_public_ip_address": false,   // OPTIONAL: Boolean
    "monitoring": true,                     // OPTIONAL: CloudWatch monitoring
    "ebs_optimized": false,                // OPTIONAL: EBS optimization
    "root_block_device": {                 // OPTIONAL: Root volume config
      "volume_type": "gp3",
      "volume_size": 8,
      "delete_on_termination": true,
      "encrypted": false
    },
    "ebs_block_device": [],                // OPTIONAL: Additional volumes
    "user_data": "#!/bin/bash\necho 'Hello'", // OPTIONAL: User data script
    "iam_instance_profile": "role-name",   // OPTIONAL: IAM role
    "tags": {                              // OPTIONAL: Resource tags
      "Name": "instance-name"
    }
  }
}
```

#### Security Group Configuration
```json
{
  "configuration": {
    "name": "sg-name",                     // REQUIRED: Security group name
    "description": "Description",          // REQUIRED: Description
    "vpc_id": "vpc-id",                    // REQUIRED: Parent VPC ID
    "ingress_rules": [                     // OPTIONAL: Inbound rules
      {
        "from_port": 80,
        "to_port": 80,
        "protocol": "tcp",
        "cidr_blocks": ["0.0.0.0/0"],      // Either cidr_blocks OR security_group_ids
        "security_group_ids": ["sg-id"],   // Reference to other security groups
        "description": "HTTP access"
      }
    ],
    "egress_rules": [                      // OPTIONAL: Outbound rules
      {
        "from_port": 0,
        "to_port": 0,
        "protocol": "-1",
        "cidr_blocks": ["0.0.0.0/0"],
        "description": "All outbound"
      }
    ],
    "tags": {                              // OPTIONAL: Resource tags
      "Name": "sg-name"
    }
  }
}
```

#### S3 Bucket Configuration
```json
{
  "configuration": {
    "bucket_name": "unique-bucket-name",    // REQUIRED: Globally unique name
    "acl": "private",                       // OPTIONAL: ACL setting
    "versioning": true,                     // OPTIONAL: Enable versioning
    "encryption": {                         // OPTIONAL: Encryption config
      "sse_algorithm": "AES256",
      "kms_key_id": "key-id"
    },
    "lifecycle_rules": [                    // OPTIONAL: Lifecycle rules
      {
        "id": "rule-1",
        "status": "Enabled",
        "expiration_days": 90
      }
    ],
    "tags": {                              // OPTIONAL: Resource tags
      "Name": "bucket-name"
    }
  }
}
```

### 6. Connections Array (Required)

Defines relationships between resources:

```json
{
  "connections": [
    {
      "id": "connection-id",              // OPTIONAL: Unique identifier
      "source": "source-node-id",        // REQUIRED: Source node ID
      "target": "target-node-id",        // REQUIRED: Target node ID
      "type": "relationship-type",       // OPTIONAL: Relationship type
      "sourceHandle": "handle-name",     // OPTIONAL: Source connection point
      "targetHandle": "handle-name"      // OPTIONAL: Target connection point
    }
  ]
}
```

#### Connection Types
- `contains` - Parent-child relationship (VPC contains subnets)
- `secures` - Security relationship (SG secures instances)
- `connects_to` - Network connectivity
- `depends_on` - Dependency relationship

### 7. Variables Object (Optional)

Terraform input variables:

```json
{
  "variables": {
    "variable_name": {
      "description": "Variable description",
      "type": "string",                    // "string", "number", "bool", "list", "map"
      "default": "default-value",          // OPTIONAL: Default value
      "sensitive": false                   // OPTIONAL: Mark as sensitive
    }
  }
}
```

### 8. Outputs Object (Optional)

Terraform output values:

```json
{
  "outputs": {
    "output_name": {
      "description": "Output description",
      "value": "${aws_resource.name.attribute}",  // Terraform expression
      "sensitive": false                          // OPTIONAL: Mark as sensitive
    }
  }
}
```

## Validation Rules

### 1. Required Field Validation
- All fields marked as REQUIRED must be present
- String fields cannot be empty
- Arrays must contain at least one item where specified

### 2. Data Type Validation
- `position.x` and `position.y` must be numbers
- Boolean fields must be `true` or `false`
- Timestamps must be valid ISO 8601 format

### 3. Reference Validation
- Node IDs must be unique within the architecture
- Connection source/target must reference existing node IDs
- Parent-child relationships must be valid (no circular dependencies)

### 4. Network Validation
- CIDR blocks must be valid IPv4 CIDR notation
- Subnet CIDR blocks must be within VPC CIDR range
- Security group ports must be valid (0-65535)

### 5. AWS-Specific Validation
- Instance types must be valid AWS instance types
- AMI IDs must follow AWS format (ami-xxxxxxxx)
- Availability zones must be valid for the region
- Security group protocols must be valid (tcp, udp, icmp, -1)

## Error Handling

The backend returns validation errors in this format:

```json
{
  "success": false,
  "message": "Architecture validation failed",
  "details": "Field metadata.name is required; Invalid CIDR block format",
  "data": null
}
```

## Best Practices

### 1. Resource Naming
- Use consistent naming conventions
- Include environment in resource names
- Use descriptive names that indicate purpose

### 2. Network Design
- Use non-overlapping CIDR blocks
- Plan subnet sizes appropriately
- Follow AWS networking best practices

### 3. Security
- Minimize security group rule scope
- Use security group references instead of CIDR blocks where possible
- Enable encryption for sensitive resources

### 4. Resource Organization
- Group related resources logically
- Use consistent tagging strategy
- Define clear dependency relationships

### 5. Variable Usage
- Use variables for environment-specific values
- Provide sensible defaults
- Document variable purposes clearly

## Example Complete Architecture

See the `bastion-host-architecture-example.json` file for a complete example of a bastion host architecture that demonstrates all concepts covered in this specification.

## API Endpoints

### Generate Terraform
- **POST** `/api/terraform/generate`
- **Body**: JSON with `architectureData` and optional `projectName`
- **Response**: Generated Terraform configuration files

### Validate Architecture
- **POST** `/api/terraform/validate`
- **Body**: JSON with `architectureData`
- **Response**: Validation results

### Get Available Modules
- **GET** `/api/terraform/modules`
- **Response**: List of available Terraform modules

This specification ensures that your JSON data will be correctly processed by the Darch backend for Terraform file generation.
