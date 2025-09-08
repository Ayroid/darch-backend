# Darch Backend - Modular Terraform Architecture

## 🎯 Overview

The Darch Backend has been transformed into a sophisticated modular Terraform architecture that converts AWS architecture diagrams into deployable, maintainable infrastructure code.

## 🏗️ Architecture Transformation

### From Monolithic to Modular
- ❌ **Before**: Direct JSON → HCL conversion
- ✅ **After**: JSON → Architecture Parser → Module Mapper → Terraform Generator

### New System Components

#### 1. **Module Registry Service**
- Discovers and manages Terraform modules
- Validates module configurations
- Provides module metadata and documentation

#### 2. **Architecture Parser Service**
- Parses JSON architecture data
- Validates relationships and dependencies
- Normalizes configuration data

#### 3. **Module Mapper Service**
- Maps resource types to Terraform modules
- Resolves dependencies and ordering
- Generates module configurations

#### 4. **Modular Terraform Generator**
- Creates main.tf with module compositions
- Generates variables.tf and outputs.tf
- Produces terraform.tfvars with values

## 📁 Module Structure

```
terraform-modules/
├── networking/
│   ├── vpc/                 # VPC with Internet Gateway
│   └── subnet/              # Subnets with route tables
├── compute/
│   └── ec2/                 # EC2 instances with AMI selection
├── security/
│   └── security-group/      # Security groups with rules
└── storage/
    └── s3/                  # S3 buckets with encryption
```

## 🚀 API Endpoints

### Module Management
```http
GET    /api/modules                    # List available modules
GET    /api/modules/{category}/{name}  # Get module details
POST   /api/modules/validate           # Validate module configuration
POST   /api/modules/refresh            # Refresh module registry
```

### Terraform Generation
```http
POST   /api/generate-terraform         # Generate modular Terraform
POST   /api/terraform/plan             # Generate plan preview
```

### Architecture Validation
```http
POST   /api/validate/architecture      # Validate architecture design
POST   /api/validate/dependencies      # Validate dependencies
```

## 🧪 Testing the New System

### 1. Get Available Modules
```bash
curl -X GET http://localhost:3000/api/modules
```

### 2. Test Architecture Validation
```bash
curl -X POST http://localhost:3000/api/validate/architecture \
  -H "Content-Type: application/json" \
  -d '{
    "architectureData": {
      "nodes": [
        {
          "id": "vpc-1",
          "name": "Main VPC",
          "resourceType": "aws-vpc",
          "nodeType": "container",
          "configuration": {
            "cidr_block": "10.0.0.0/16",
            "enable_dns_support": true,
            "enable_dns_hostnames": true
          }
        },
        {
          "id": "subnet-1",
          "name": "Public Subnet",
          "resourceType": "aws-public-subnet",
          "nodeType": "container",
          "parentId": "vpc-1",
          "configuration": {
            "cidr_block": "10.0.1.0/24",
            "availability_zone": "us-east-1a",
            "map_public_ip_on_launch": true
          }
        },
        {
          "id": "ec2-1",
          "name": "Web Server",
          "resourceType": "aws-ec2",
          "nodeType": "service",
          "parentId": "subnet-1",
          "configuration": {
            "instance_type": "t3.micro",
            "ami_id": "ami-0c02fb55956c7d316"
          }
        }
      ],
      "metadata": {
        "provider": "aws",
        "region": "us-east-1",
        "environment": "development",
        "project": "web-application"
      }
    }
  }'
```

### 3. Generate Modular Terraform
```bash
curl -X POST http://localhost:3000/api/generate-terraform \
  -H "Content-Type: application/json" \
  -d '{
    "architectureData": {
      "nodes": [
        {
          "id": "vpc-1",
          "name": "Main VPC",
          "resourceType": "aws-vpc",
          "nodeType": "container",
          "configuration": {
            "cidr_block": "10.0.0.0/16"
          }
        },
        {
          "id": "subnet-1",
          "name": "Public Subnet",
          "resourceType": "aws-public-subnet",
          "nodeType": "container",
          "parentId": "vpc-1",
          "configuration": {
            "cidr_block": "10.0.1.0/24",
            "availability_zone": "us-east-1a"
          }
        },
        {
          "id": "sg-1",
          "name": "Web Security Group",
          "resourceType": "security-group",
          "nodeType": "service",
          "parentId": "vpc-1",
          "configuration": {
            "ingress_rules": [
              {
                "from_port": 80,
                "to_port": 80,
                "protocol": "tcp",
                "cidr_blocks": ["0.0.0.0/0"]
              },
              {
                "from_port": 443,
                "to_port": 443,
                "protocol": "tcp",
                "cidr_blocks": ["0.0.0.0/0"]
              }
            ]
          }
        },
        {
          "id": "ec2-1",
          "name": "Web Server",
          "resourceType": "aws-ec2",
          "nodeType": "service",
          "parentId": "subnet-1",
          "configuration": {
            "instance_type": "t3.micro"
          }
        }
      ],
      "metadata": {
        "provider": "aws",
        "region": "us-east-1",
        "environment": "development",
        "project": "web-application"
      }
    },
    "projectName": "web-app-infrastructure"
  }'
```

## 📋 Generated Terraform Example

The new system generates clean, modular Terraform:

### main.tf
```hcl
################################################################################
# Main Terraform configuration with module definitions
# Generated by Darch - Diagram to Infrastructure Tool
################################################################################

locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    CreatedBy   = "Darch"
    Region      = var.aws_region
  }

  name_prefix = "${var.project_name}-${var.environment}"
}

module "main_vpc_vpc_1" {
  source = "./terraform-modules/networking/vpc"

  name                     = "Main VPC"
  cidr_block              = "10.0.0.0/16"
  enable_dns_hostnames    = true
  enable_dns_support      = true
  create_internet_gateway = true
  region                  = var.aws_region
  tags                    = local.common_tags
}

module "public_subnet_subnet_1" {
  source = "./terraform-modules/networking/subnet"

  name                    = "Public Subnet"
  vpc_id                  = module.main_vpc_vpc_1.vpc_id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  subnet_type             = "public"
  map_public_ip_on_launch = true
  internet_gateway_id     = module.main_vpc_vpc_1.internet_gateway_id
  tags                    = local.common_tags

  depends_on = [
    module.main_vpc_vpc_1,
  ]
}

module "web_security_group_sg_1" {
  source = "./terraform-modules/security/security-group"

  name        = "Web Security Group"
  description = "Security group for Web Security Group"
  vpc_id      = module.main_vpc_vpc_1.vpc_id
  ingress_rules = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP access"
    },
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS access"
    }
  ]
  tags = local.common_tags

  depends_on = [
    module.main_vpc_vpc_1,
  ]
}

module "web_server_ec2_1" {
  source = "./terraform-modules/compute/ec2"

  name                        = "Web Server"
  instance_type               = "t3.micro"
  subnet_id                   = module.public_subnet_subnet_1.subnet_id
  security_group_ids          = [module.web_security_group_sg_1.security_group_id]
  associate_public_ip_address = true
  tags                        = local.common_tags

  depends_on = [
    module.public_subnet_subnet_1,
    module.web_security_group_sg_1,
  ]
}
```

## 🔧 Key Features

### 1. **Dependency Resolution**
- Automatic topological sorting
- Circular dependency detection
- Parent-child relationship handling

### 2. **Validation System**
- Architecture validation
- Module configuration validation
- CIDR block overlap detection
- Security best practices checks

### 3. **Module Reusability**
- Standardized module interface
- Version management
- Parameter validation
- Documentation generation

### 4. **Enterprise Ready**
- Cost estimation preview
- Resource summarization
- Terraform plan generation
- Multi-environment support

## 🎯 Benefits

1. **Maintainability**: Modular structure makes updates easier
2. **Reusability**: Modules can be shared across projects
3. **Validation**: Comprehensive validation at multiple levels
4. **Scalability**: Easy to add new cloud providers and services
5. **Best Practices**: Enforces AWS and Terraform best practices
6. **Enterprise Grade**: Supports complex multi-tier applications

## � Updated API

### Current API Endpoints
- All functionality available at `/api/*`
- Comprehensive modular architecture
- Enhanced error handling and validation
- Complete documentation

### API Features
- Modular Terraform generation
- Architecture validation
- Dependency checking
- Module registry management

## 🔮 Future Enhancements

- Multi-cloud support (Azure, GCP)
- Infrastructure drift detection
- Cost optimization recommendations
- Integration with Terraform Cloud
- Module marketplace
- CI/CD pipeline integration

This transformation makes Darch Backend a production-ready, enterprise-grade infrastructure-as-code generator! 🚀
