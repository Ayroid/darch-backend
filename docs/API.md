# API Documentation

This document provides comprehensive information about the Darch Backend Modular Terraform API endpoints.

## Base URL

```
http://localhost:5000
```

## Overview

The Darch Backend API provides enterprise-grade modular Terraform generation capabilities with:

- **Modular Architecture**: Generate organized, reusable Terraform modules
- **Dependency Resolution**: Automatic dependency ordering and validation
- **Architecture Validation**: Comprehensive validation with best practices checking
- **Module Registry**: Extensive library of validated Terraform modules
- **Cost Estimation**: Resource planning with cost previews

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Optional success message",
  "timestamp": "2025-09-07T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "details": "Optional error details",
  "timestamp": "2025-09-07T10:30:00.000Z"
}
```

---

## Endpoints

### Health Check

Check if the server is running and healthy.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-09-07T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Server is healthy
- `500` - Server error

---

## 🏗️ Terraform Generation

### Generate Modular Terraform

Generate enterprise-grade modular Terraform configuration with automatic dependency resolution.

**Endpoint:** `POST /api/generate-terraform`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "architectureData": {
    "metadata": {
      "name": "string (required)",
      "description": "string (optional)",
      "version": "string (required)",
      "provider": "string (required, e.g., 'aws')",
      "region": "string (required, e.g., 'us-east-1')"
    },
    "nodes": [
      {
        "id": "string (required, unique)",
        "name": "string (required)",
        "resourceType": "string (required, e.g., 'vpc', 'ec2', 's3')",
        "position": {
          "x": "number (required)",
          "y": "number (required)"
        },
        "configuration": {
          // Resource-specific configuration
        }
      }
    ],
    "connections": [
      {
        "id": "string (required, unique)",
        "sourceId": "string (required, node ID)",
        "targetId": "string (required, node ID)",
        "connectionType": "string (required, e.g., 'contains', 'hosts')"
      }
    ]
  },
  "projectName": "string (optional, default: 'infrastructure')"
}
```

**Example Request:**
```json
{
  "architectureData": {
    "metadata": {
      "name": "production-infrastructure",
      "description": "Production AWS infrastructure",
      "version": "1.0.0",
      "provider": "aws",
      "region": "us-east-1"
    },
    "nodes": [
      {
        "id": "vpc-1",
        "name": "Main VPC",
        "resourceType": "vpc",
        "position": { "x": 100, "y": 100 },
        "configuration": {
          "cidr_block": "10.0.0.0/16",
          "enable_dns_hostnames": true,
          "enable_dns_support": true
        }
      },
      {
        "id": "subnet-1",
        "name": "Public Subnet",
        "resourceType": "subnet",
        "position": { "x": 200, "y": 150 },
        "configuration": {
          "cidr_block": "10.0.1.0/24",
          "availability_zone": "us-east-1a",
          "map_public_ip_on_launch": true
        }
      },
      {
        "id": "ec2-1",
        "name": "Web Server",
        "resourceType": "ec2",
        "position": { "x": 300, "y": 200 },
        "configuration": {
          "ami": "ami-0c02fb55956c7d316",
          "instance_type": "t3.micro",
          "key_name": "my-key-pair"
        }
      }
    ],
    "connections": [
      {
        "id": "conn-1",
        "sourceId": "vpc-1",
        "targetId": "subnet-1",
        "connectionType": "contains"
      },
      {
        "id": "conn-2",
        "sourceId": "subnet-1",
        "targetId": "ec2-1",
        "connectionType": "hosts"
      }
    ]
  },
  "projectName": "production-infra"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "terraformConfiguration": {
      "mainTf": "# Generated Terraform Configuration...",
      "variablesTf": "# Variables Configuration...",
      "outputsTf": "# Outputs Configuration...",
      "files": [
        {
          "filename": "main.tf",
          "content": "# Main Terraform configuration..."
        },
        {
          "filename": "variables.tf",
          "content": "# Variable definitions..."
        },
        {
          "filename": "outputs.tf",
          "content": "# Output definitions..."
        }
      ]
    },
    "savedFiles": {
      "projectDir": "src/output/production-infra-2025-09-07T10-30-00-000Z",
      "files": ["main.tf", "variables.tf", "outputs.tf"]
    },
    "validation": {
      "syntaxValid": true,
      "errors": [],
      "warnings": []
    },
    "architectureValidation": {
      "valid": true,
      "errors": [],
      "warnings": []
    },
    "moduleMapping": {
      "modulesGenerated": 3,
      "dependencies": 2,
      "warnings": []
    },
    "projectName": "production-infra"
  },
  "message": "Modular Terraform configuration generated successfully"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request body or validation error
- `500` - Server error

---

### Generate Terraform Plan Preview

Generate a preview of resources and estimated costs before deployment.

**Endpoint:** `POST /api/terraform/plan`

**Content-Type:** `application/json`

**Request Body:** Same as `/api/generate-terraform`

**Response:**
```json
{
  "success": true,
  "data": {
    "resourceSummary": {
      "totalResources": 3,
      "resourceTypes": {
        "vpc": 1,
        "subnet": 1,
        "ec2": 1
      },
      "modules": 3
    },
    "costEstimate": {
      "monthlyEstimate": 15,
      "breakdown": {
        "vpc": 0,
        "subnet": 0,
        "ec2": 15
      },
      "currency": "USD",
      "disclaimer": "This is a rough estimate. Actual costs may vary based on usage and AWS pricing changes."
    },
    "modules": [
      {
        "name": "vpc-1",
        "source": "./terraform-modules/networking/vpc",
        "variableCount": 3
      }
    ],
    "dependencies": 2,
    "warnings": []
  },
  "message": "Terraform plan preview generated"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request body
- `500` - Server error

---

## 📦 Module Management

### Get Available Modules

List all available Terraform modules in the registry.

**Endpoint:** `GET /api/modules`

**Response:**
```json
{
  "success": true,
  "data": {
    "modules": [
      {
        "name": "vpc",
        "category": "networking",
        "version": "1.0.0",
        "description": "AWS VPC with configurable CIDR and DNS settings",
        "variables": ["cidr_block", "enable_dns_hostnames", "enable_dns_support"],
        "outputs": ["vpc_id", "vpc_cidr_block"],
        "path": "./terraform-modules/networking/vpc"
      },
      {
        "name": "subnet",
        "category": "networking",
        "version": "1.0.0",
        "description": "AWS subnet with availability zone and routing configuration",
        "variables": ["vpc_id", "cidr_block", "availability_zone"],
        "outputs": ["subnet_id", "subnet_arn"],
        "path": "./terraform-modules/networking/subnet"
      }
    ],
    "modulesByCategory": {
      "networking": [
        {
          "name": "vpc",
          "version": "1.0.0",
          "description": "AWS VPC with configurable CIDR and DNS settings"
        },
        {
          "name": "subnet",
          "version": "1.0.0",
          "description": "AWS subnet with availability zone and routing configuration"
        }
      ],
      "compute": [
        {
          "name": "ec2",
          "version": "1.0.0",
          "description": "AWS EC2 instance with security group integration"
        }
      ],
      "security": [
        {
          "name": "security-group",
          "version": "1.0.0",
          "description": "AWS security group with ingress/egress rules"
        }
      ],
      "storage": [
        {
          "name": "s3",
          "version": "1.0.0",
          "description": "AWS S3 bucket with versioning and encryption"
        }
      ]
    },
    "totalModules": 12,
    "categories": ["networking", "compute", "security", "storage"]
  },
  "message": "Available modules retrieved successfully"
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### Get Module Details

Get detailed information about a specific module.

**Endpoint:** `GET /api/modules/:category/:name`

**Parameters:**
- `category` (required): Module category (e.g., "networking", "compute")
- `name` (required): Module name (e.g., "vpc", "ec2")

**Response:**
```json
{
  "success": true,
  "data": {
    "module": {
      "name": "vpc",
      "category": "networking",
      "version": "1.0.0",
      "description": "AWS VPC with configurable CIDR and DNS settings",
      "variables": [
        {
          "name": "cidr_block",
          "type": "string",
          "description": "CIDR block for the VPC",
          "required": true
        },
        {
          "name": "enable_dns_hostnames",
          "type": "bool",
          "description": "Enable DNS hostnames",
          "required": false,
          "default": true
        }
      ],
      "outputs": [
        {
          "name": "vpc_id",
          "description": "ID of the VPC"
        },
        {
          "name": "vpc_cidr_block",
          "description": "CIDR block of the VPC"
        }
      ],
      "path": "./terraform-modules/networking/vpc"
    },
    "metadata": {
      "author": "Darch Team",
      "createdAt": "2025-09-07T10:30:00.000Z",
      "lastModified": "2025-09-07T10:30:00.000Z",
      "documentation": "https://docs.darch.dev/modules/vpc",
      "examples": [
        {
          "name": "Basic VPC",
          "description": "Simple VPC with default settings",
          "configuration": {
            "cidr_block": "10.0.0.0/16"
          }
        }
      ]
    }
  },
  "message": "Module details retrieved successfully"
}
```

**Status Codes:**
- `200` - Success
- `404` - Module not found
- `500` - Server error

---

### Validate Module Configuration

Validate a module configuration before using it.

**Endpoint:** `POST /api/modules/validate`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "category": "string (required)",
  "name": "string (required)",
  "configuration": {
    // Module-specific configuration
  }
}
```

**Example Request:**
```json
{
  "category": "networking",
  "name": "vpc",
  "configuration": {
    "cidr_block": "10.0.0.0/16",
    "enable_dns_hostnames": true,
    "enable_dns_support": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "validation": {
      "valid": true,
      "errors": [],
      "warnings": []
    },
    "module": "networking/vpc",
    "configuration": {
      "cidr_block": "10.0.0.0/16",
      "enable_dns_hostnames": true,
      "enable_dns_support": true
    }
  },
  "message": "Module configuration validation completed"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid configuration
- `404` - Module not found
- `500` - Server error

---

### Refresh Module Registry

Refresh the module registry to load new or updated modules.

**Endpoint:** `POST /api/modules/refresh`

**Response:**
```json
{
  "success": true,
  "data": {
    "modulesLoaded": 12,
    "categories": ["networking", "compute", "security", "storage"]
  },
  "message": "Module registry refreshed successfully"
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

## 🔍 Architecture Validation

### Validate Architecture Design

Validate the overall architecture design for best practices and compatibility.

**Endpoint:** `POST /api/validate/architecture`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "architectureData": {
    // Same structure as generate-terraform
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "validation": {
      "valid": true,
      "errors": [],
      "warnings": [
        {
          "type": "security_warning",
          "message": "Public subnet detected without NAT gateway",
          "severity": "medium",
          "nodeId": "subnet-1"
        }
      ]
    },
    "nodes": 3,
    "connections": 2,
    "metadata": {
      "name": "production-infrastructure",
      "provider": "aws",
      "region": "us-east-1"
    }
  },
  "message": "Architecture validation completed"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid architecture data
- `500` - Server error

---

### Validate Dependencies

Validate resource dependencies and detect circular dependencies.

**Endpoint:** `POST /api/validate/dependencies`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "architectureData": {
    // Same structure as generate-terraform
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dependencyGraph": {
      "nodes": [
        {
          "id": "vpc-1",
          "name": "Main VPC",
          "type": "vpc",
          "module": "networking/vpc",
          "level": 0
        },
        {
          "id": "subnet-1",
          "name": "Public Subnet",
          "type": "subnet",
          "module": "networking/subnet",
          "level": 1
        }
      ],
      "edges": [
        {
          "source": "vpc-1",
          "target": "subnet-1",
          "type": "dependency"
        }
      ]
    },
    "circularDependencies": [],
    "dependencyLevels": [
      {
        "module": "vpc-1",
        "level": 0,
        "dependsOn": []
      },
      {
        "module": "subnet-1",
        "level": 1,
        "dependsOn": ["vpc-1"]
      }
    ]
  },
  "message": "Dependency validation completed"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid architecture data
- `500` - Server error

---

## 📁 File Management

### List Terraform Files

Get list of all generated Terraform projects.

**Endpoint:** `GET /api/terraform-files`

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "name": "main.tf",
        "path": "src/output/production-infra-2025-09-07T10-30-00-000Z/main.tf",
        "size": 2048,
        "createdAt": "2025-09-07T10:30:00.000Z",
        "modifiedAt": "2025-09-07T10:30:00.000Z"
      },
      {
        "name": "variables.tf",
        "path": "src/output/production-infra-2025-09-07T10-30-00-000Z/variables.tf",
        "size": 512,
        "createdAt": "2025-09-07T10:30:00.000Z",
        "modifiedAt": "2025-09-07T10:30:00.000Z"
      }
    ]
  }
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### Get Terraform File Content

Get the content of a specific Terraform file.

**Endpoint:** `GET /api/terraform-files/:filename`

**Parameters:**
- `filename` (required): Name of the Terraform file (must end with `.tf`)

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "main.tf",
    "content": "# Generated Terraform Configuration\n\nprovider \"aws\" {\n  region = \"us-east-1\"\n}\n\n..."
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid filename
- `404` - File not found
- `500` - Server error

---

### Download Terraform File

Download a Terraform file as an attachment.

**Endpoint:** `GET /api/terraform-files/:filename/download`

**Parameters:**
- `filename` (required): Name of the Terraform file (must end with `.tf`)

**Response:**
The file will be downloaded as an attachment with the appropriate headers.

**Status Codes:**
- `200` - File download successful
- `400` - Invalid filename
- `404` - File not found
- `500` - Server error

---

## Resource Type Mapping

The system supports the following resource types with automatic module mapping:

### Networking
| Resource Type | Terraform Module | AWS Resource |
|---------------|------------------|--------------|
| `vpc`, `aws-vpc` | `networking/vpc` | `aws_vpc` |
| `subnet`, `aws-subnet` | `networking/subnet` | `aws_subnet` |
| `internet-gateway`, `aws-internet-gateway`, `igw` | `networking/internet-gateway` | `aws_internet_gateway` |
| `route-table`, `aws-route-table`, `rt` | `networking/route-table` | `aws_route_table` |
| `nat-gateway`, `aws-nat-gateway` | `networking/nat-gateway` | `aws_nat_gateway` |

### Compute
| Resource Type | Terraform Module | AWS Resource |
|---------------|------------------|--------------|
| `ec2` | `compute/ec2` | `aws_instance` |
| `auto-scaling-group` | `compute/auto-scaling` | `aws_autoscaling_group` |
| `load-balancer` | `compute/load-balancer` | `aws_lb` |

### Security
| Resource Type | Terraform Module | AWS Resource |
|---------------|------------------|--------------|
| `security-group` | `security/security-group` | `aws_security_group` |
| `iam-role` | `security/iam-role` | `aws_iam_role` |
| `key-pair` | `security/key-pair` | `aws_key_pair` |

### Storage
| Resource Type | Terraform Module | AWS Resource |
|---------------|------------------|--------------|
| `s3` | `storage/s3` | `aws_s3_bucket` |
| `ebs` | `storage/ebs` | `aws_ebs_volume` |

---

## Error Codes

### Validation Errors (400)
- Missing required fields in request body
- Invalid architecture data structure
- Invalid module configuration
- Circular dependencies detected

### Not Found Errors (404)
- Terraform file not found
- Module not found
- Invalid API endpoint

### Server Errors (500)
- Terraform generation failure
- Module registry errors
- File system errors
- Unexpected server errors

---

## Examples

### Complete Workflow Example

1. **List available modules:**
```bash
curl http://localhost:5000/api/modules
```

2. **Validate architecture:**
```bash
curl -X POST http://localhost:5000/api/validate/architecture \
  -H "Content-Type: application/json" \
  -d '{
    "architectureData": {
      "metadata": {
        "name": "test-infra",
        "version": "1.0.0",
        "provider": "aws",
        "region": "us-east-1"
      },
      "nodes": [
        {
          "id": "vpc-1",
          "name": "Main VPC",
          "resourceType": "vpc",
          "position": {"x": 100, "y": 100},
          "configuration": {
            "cidr_block": "10.0.0.0/16"
          }
        }
      ],
      "connections": []
    }
  }'
```

3. **Generate Terraform plan preview:**
```bash
curl -X POST http://localhost:5000/api/terraform/plan \
  -H "Content-Type: application/json" \
  -d '{
    "architectureData": {
      "metadata": {
        "name": "test-infra",
        "version": "1.0.0",
        "provider": "aws",
        "region": "us-east-1"
      },
      "nodes": [
        {
          "id": "vpc-1",
          "name": "Main VPC",
          "resourceType": "vpc",
          "position": {"x": 100, "y": 100},
          "configuration": {
            "cidr_block": "10.0.0.0/16"
          }
        }
      ],
      "connections": []
    }
  }'
```

4. **Generate modular Terraform:**
```bash
curl -X POST http://localhost:5000/api/generate-terraform \
  -H "Content-Type: application/json" \
  -d '{
    "architectureData": {
      "metadata": {
        "name": "production-infra",
        "version": "1.0.0",
        "provider": "aws",
        "region": "us-east-1"
      },
      "nodes": [
        {
          "id": "vpc-1",
          "name": "Main VPC",
          "resourceType": "vpc",
          "position": {"x": 100, "y": 100},
          "configuration": {
            "cidr_block": "10.0.0.0/16",
            "enable_dns_hostnames": true
          }
        }
      ],
      "connections": []
    },
    "projectName": "my-infrastructure"
  }'
```

5. **List generated files:**
```bash
curl http://localhost:5000/api/terraform-files
```

---

## SDK Examples

### TypeScript Client

```typescript
interface ArchitectureData {
  metadata: {
    name: string;
    version: string;
    provider: string;
    region: string;
  };
  nodes: Array<{
    id: string;
    name: string;
    resourceType: string;
    position: { x: number; y: number };
    configuration: Record<string, any>;
  }>;
  connections: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    connectionType: string;
  }>;
}

class DarchBackendClient {
  constructor(private baseUrl: string = 'http://localhost:5000') {}

  async generateTerraform(architectureData: ArchitectureData, projectName?: string) {
    const response = await fetch(`${this.baseUrl}/api/generate-terraform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ architectureData, projectName }),
    });
    return response.json();
  }

  async generatePlan(architectureData: ArchitectureData) {
    const response = await fetch(`${this.baseUrl}/api/terraform/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ architectureData }),
    });
    return response.json();
  }

  async validateArchitecture(architectureData: ArchitectureData) {
    const response = await fetch(`${this.baseUrl}/api/validate/architecture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ architectureData }),
    });
    return response.json();
  }

  async getModules() {
    const response = await fetch(`${this.baseUrl}/api/modules`);
    return response.json();
  }

  async getModuleDetails(category: string, name: string) {
    const response = await fetch(`${this.baseUrl}/api/modules/${category}/${name}`);
    return response.json();
  }
}
```

### Python Client

```python
import requests
from typing import Dict, List, Optional

class DarchBackendClient:
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url

    def generate_terraform(self, architecture_data: Dict, project_name: Optional[str] = None):
        payload = {
            "architectureData": architecture_data,
            "projectName": project_name
        }
        response = requests.post(
            f"{self.base_url}/api/generate-terraform",
            json=payload
        )
        return response.json()

    def generate_plan(self, architecture_data: Dict):
        payload = {"architectureData": architecture_data}
        response = requests.post(
            f"{self.base_url}/api/terraform/plan",
            json=payload
        )
        return response.json()

    def validate_architecture(self, architecture_data: Dict):
        payload = {"architectureData": architecture_data}
        response = requests.post(
            f"{self.base_url}/api/validate/architecture",
            json=payload
        )
        return response.json()

    def get_modules(self):
        response = requests.get(f"{self.base_url}/api/modules")
        return response.json()

    def get_module_details(self, category: str, name: str):
        response = requests.get(f"{self.base_url}/api/modules/{category}/{name}")
        return response.json()
```
