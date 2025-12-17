# Atomic Modules Architecture for Terraform

## Overview

This document describes the atomic modules architecture approach for building Terraform infrastructure, specifically designed for diagram-to-infrastructure applications.

## Core Principle

**One Resource = One Module**

Each AWS resource type gets its own isolated, reusable module. This enables:
- Granular control over individual resources
- Easy mapping from diagram nodes to infrastructure
- Flexible composition and reusability
- Independent testing and versioning

## Directory Structure

```
project-root/
├── main.tf                 # Root orchestration file
├── variables.tf            # Root input variables
├── outputs.tf              # Root outputs
├── provider.tf             # AWS provider configuration
└── modules/
    ├── vpc/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── subnet/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── internet_gateway/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── route_table/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── security_group/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── key_pair/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    └── ec2_instance/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

## Module Interaction Flow

```
┌─────────────────────────────────────────────────────────┐
│                      Root main.tf                        │
│                   (Orchestration Layer)                  │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
    ┌──────┐          ┌──────────┐        ┌─────────┐
    │ VPC  │──────────│ Internet │        │Subnet(s)│
    │      │          │ Gateway  │        │         │
    └──┬───┘          └────┬─────┘        └────┬────┘
       │                   │                   │
       │         ┌─────────┴───────────────────┘
       │         │
       ▼         ▼
    ┌──────────────┐
    │ Route Table  │
    │  + Routes    │
    └──────────────┘
       │
       ▼
    ┌──────────────┐
    │  Security    │
    │   Group      │
    └──────┬───────┘
           │
           │    ┌───────────┐
           └────│ Key Pair  │
                └─────┬─────┘
                      │
                      ▼
                ┌──────────────┐
                │ EC2 Instance │
                └──────────────┘
```

## Data Flow & Dependencies

### 1. VPC Module
**Creates:** Virtual Private Cloud
**Outputs:** `vpc_id`, `cidr_block`, `arn`
**Dependencies:** None (root resource)

### 2. Internet Gateway Module
**Creates:** Internet Gateway attached to VPC
**Inputs:** `vpc_id` (from VPC module)
**Outputs:** `id`, `arn`
**Dependencies:** VPC

### 3. Subnet Module
**Creates:** Subnet within VPC
**Inputs:** `vpc_id` (from VPC module)
**Outputs:** `subnet_id`, `cidr_block`, `arn`
**Dependencies:** VPC

### 4. Route Table Module
**Creates:** Route table with routes and subnet associations
**Inputs:**
- `vpc_id` (from VPC module)
- `internet_gateway_id` (from IGW module)
- `subnet_ids` (from Subnet modules)
**Outputs:** `route_table_id`, `arn`
**Dependencies:** VPC, Internet Gateway, Subnet(s)

### 5. Security Group Module
**Creates:** Security group with ingress/egress rules
**Inputs:** `vpc_id` (from VPC module)
**Outputs:** `security_group_id`, `arn`, `name`
**Dependencies:** VPC

### 6. Key Pair Module
**Creates:** SSH key pair for EC2 access
**Inputs:** `public_key_path` (file path)
**Outputs:** `key_name`, `id`, `fingerprint`
**Dependencies:** None (independent)

### 7. EC2 Instance Module
**Creates:** EC2 instance with root volume
**Inputs:**
- `subnet_id` (from Subnet module)
- `security_group_ids` (from Security Group module)
- `key_name` (from Key Pair module)
**Outputs:** `instance_id`, `public_ip`, `private_ip`, `arn`
**Dependencies:** Subnet, Security Group, Key Pair

## Module Composition in main.tf

```hcl
# Step 1: Create VPC
module "vpc" {
  source = "./modules/vpc"
  # ... configuration
}

# Step 2: Create Internet Gateway (depends on VPC)
module "internet_gateway" {
  source = "./modules/internet_gateway"
  vpc_id = module.vpc.id  # <-- Dependency
}

# Step 3: Create Subnet (depends on VPC)
module "public_subnet" {
  source = "./modules/subnet"
  vpc_id = module.vpc.id  # <-- Dependency
}

# Step 4: Create Route Table (depends on VPC, IGW, Subnet)
module "public_route_table" {
  source              = "./modules/route_table"
  vpc_id              = module.vpc.id              # <-- Dependency
  internet_gateway_id = module.internet_gateway.id # <-- Dependency
  subnet_ids          = [module.public_subnet.id]  # <-- Dependency
}

# Step 5: Create Security Group (depends on VPC)
module "security_group" {
  source = "./modules/security_group"
  vpc_id = module.vpc.id  # <-- Dependency
}

# Step 6: Create Key Pair (independent)
module "key_pair" {
  source = "./modules/key_pair"
  # ... configuration
}

# Step 7: Create EC2 Instance (depends on Subnet, SG, Key Pair)
module "ec2_instance" {
  source             = "./modules/ec2_instance"
  subnet_id          = module.public_subnet.id        # <-- Dependency
  security_group_ids = [module.security_group.id]     # <-- Dependency
  key_name           = module.key_pair.key_name       # <-- Dependency
}
```

## Advantages for Diagram-to-Infrastructure

### 1. One-to-One Mapping
Each diagram node maps directly to a module call:
- Drag "VPC" icon → Generate `module "vpc"` block
- Drag "EC2" icon → Generate `module "ec2_instance"` block

### 2. Visual Dependency Tracking
Diagram connections = Terraform dependencies:
- Line from VPC to Subnet → `vpc_id = module.vpc.id`
- Line from SG to EC2 → `security_group_ids = [module.security_group.id]`

### 3. Incremental Changes
Users can modify diagrams incrementally:
- Add new subnet → Add new `module "subnet"` block
- Remove security rule → Update module parameters
- No need to recreate entire grouped resources

### 4. Reusability
Modules can be reused across different diagrams:
- Same VPC module for dev/staging/prod
- Same security group module with different rules
- Easy to create templates

### 5. State Management
Fine-grained state tracking:
- Each resource has its own state entry
- Easy to import existing resources
- Targeted plan/apply operations

## Variable Propagation Pattern

```
Root variables.tf
       │
       ├─> Passed to module "vpc"
       ├─> Passed to module "subnet"
       └─> Passed to module "ec2_instance"
              │
              └─> Uses outputs from other modules
```

Example:
```hcl
# Root variables.tf
variable "vpc_cidr" {
  type = string
}

variable "instance_type" {
  type = string
}

# Root main.tf
module "vpc" {
  source     = "./modules/vpc"
  cidr_block = var.vpc_cidr  # Root variable
}

module "ec2_instance" {
  source        = "./modules/ec2_instance"
  instance_type = var.instance_type      # Root variable
  subnet_id     = module.vpc.subnet_id   # Module output
}
```

## Best Practices

### 1. Module Design
- **Single Responsibility**: Each module manages ONE resource type
- **No Cross-Dependencies**: Modules don't reference other modules
- **Output Everything**: Expose all useful attributes as outputs
- **Flexible Inputs**: Use sensible defaults, allow overrides

### 2. Naming Conventions
- Module directories: lowercase, descriptive (e.g., `vpc`, `ec2_instance`)
- Resources within modules: `this` (since there's only one)
- Output names: match AWS attribute names where possible

### 3. Documentation
Each module should have:
- README.md with usage examples
- Input variable descriptions
- Output descriptions
- Dependency requirements

### 4. Validation
```hcl
# In module variables.tf
variable "cidr_block" {
  type        = string
  description = "CIDR block for VPC"

  validation {
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "Must be a valid IPv4 CIDR block."
  }
}
```

## Testing Strategy

### Unit Testing (per module)
```bash
cd modules/vpc
terraform init
terraform plan -var-file=test.tfvars
terraform apply -auto-approve
terraform destroy -auto-approve
```

### Integration Testing (root)
```bash
terraform init
terraform plan
terraform apply -auto-approve
# Run tests
terraform destroy -auto-approve
```

## Migration from Monolithic to Atomic

### Old Approach (Monolithic)
```hcl
# Single main.tf with all resources
resource "aws_vpc" "main" { }
resource "aws_subnet" "public" { }
resource "aws_security_group" "web" { }
resource "aws_instance" "server" { }
```

### New Approach (Atomic Modules)
```hcl
# main.tf orchestrates modules
module "vpc" { source = "./modules/vpc" }
module "subnet" { source = "./modules/subnet" }
module "security_group" { source = "./modules/security_group" }
module "ec2_instance" { source = "./modules/ec2_instance" }
```

## Common Patterns

### Pattern 1: Multi-Subnet VPC
```hcl
module "public_subnet_1" {
  source = "./modules/subnet"
  vpc_id = module.vpc.id
  cidr_block = "10.0.1.0/24"
  availability_zone = "us-east-1a"
}

module "public_subnet_2" {
  source = "./modules/subnet"
  vpc_id = module.vpc.id
  cidr_block = "10.0.2.0/24"
  availability_zone = "us-east-1b"
}

module "route_table" {
  source = "./modules/route_table"
  vpc_id = module.vpc.id
  subnet_ids = [
    module.public_subnet_1.id,
    module.public_subnet_2.id
  ]
}
```

### Pattern 2: Multiple Security Groups
```hcl
module "web_sg" {
  source = "./modules/security_group"
  vpc_id = module.vpc.id
  name   = "web-sg"
  ingress_rules = [...]
}

module "db_sg" {
  source = "./modules/security_group"
  vpc_id = module.vpc.id
  name   = "db-sg"
  ingress_rules = [...]
}

module "web_server" {
  source = "./modules/ec2_instance"
  security_group_ids = [module.web_sg.id]
}
```

### Pattern 3: Auto Scaling Group
```hcl
module "launch_template" {
  source = "./modules/launch_template"
  security_group_ids = [module.web_sg.id]
}

module "auto_scaling_group" {
  source = "./modules/auto_scaling_group"
  launch_template_id = module.launch_template.id
  subnet_ids = [
    module.public_subnet_1.id,
    module.public_subnet_2.id
  ]
}
```

## Troubleshooting

### Issue: Circular Dependencies
**Problem:** Module A depends on Module B, and B depends on A
**Solution:** Re-architect to break the cycle or use data sources

### Issue: Module Not Found
**Problem:** `Error: Module not installed`
**Solution:** Run `terraform init` after creating new modules

### Issue: State Conflicts
**Problem:** Resource already exists in different state
**Solution:** Use `terraform import` or `terraform state mv`

## Comparison: Atomic vs Grouped Modules

| Aspect | Atomic Modules | Grouped Modules |
|--------|---------------|-----------------|
| Granularity | One resource per module | Multiple resources per module |
| Flexibility | High - mix and match | Low - all-or-nothing |
| Diagram Mapping | 1:1 with diagram nodes | Complex mapping required |
| Reusability | Very high | Moderate |
| State Management | Fine-grained | Coarse-grained |
| Initial Setup | More files | Fewer files |
| Maintenance | Easier per module | Easier overall |
| Best For | Diagram-based tools | Traditional IaC |

## Conclusion

The atomic modules architecture provides maximum flexibility for diagram-to-infrastructure applications by:
1. Maintaining 1:1 mapping between visual components and Terraform modules
2. Enabling granular control over individual resources
3. Supporting incremental modifications without cascading changes
4. Facilitating reusability across different projects and environments

This approach prioritizes **composability** over **convenience**, making it ideal for visual infrastructure tools where users expect fine-grained control.