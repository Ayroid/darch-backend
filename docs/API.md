# API Documentation

This document provides detailed information about the Darch Backend REST API endpoints.

## Base URL

```
http://localhost:5000
```

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

### Generate Terraform from Architecture Data

Generate Terraform configuration from structured architecture data.

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
      "createdAt": "string (ISO date, required)",
      "lastModified": "string (ISO date, required)",
      "provider": "string (required, e.g., 'aws')"
    },
    "nodes": [
      {
        "id": "string (required, unique)",
        "nodeType": "string (required, 'awsService' | 'awsContainer')",
        "resourceType": "string (required, e.g., 'ec2', 'vpc', 's3')",
        "name": "string (required)",
        "icon": "string (required)",
        "position": {
          "x": "number (required)",
          "y": "number (required)"
        },
        "dimensions": {
          "width": "number (optional)",
          "height": "number (optional)"
        },
        "configuration": {
          // Resource-specific configuration
        },
        "parentId": "string (optional)"
      }
    ],
    "connections": [
      {
        "id": "string (required, unique)",
        "source": "string (required, node ID)",
        "target": "string (required, node ID)",
        "sourceHandle": "string (optional)",
        "targetHandle": "string (optional)",
        "type": "string (optional)"
      }
    ],
    "variables": {
      // Optional Terraform variables
    },
    "outputs": {
      // Optional Terraform outputs
    }
  },
  "projectName": "string (optional, default: 'infrastructure')"
}
```

**Example Request:**
```json
{
  "architectureData": {
    "metadata": {
      "name": "web-application",
      "description": "Simple web application infrastructure",
      "version": "1.0.0",
      "createdAt": "2025-09-07T10:30:00.000Z",
      "lastModified": "2025-09-07T10:30:00.000Z",
      "provider": "aws"
    },
    "nodes": [
      {
        "id": "node-1",
        "nodeType": "awsService",
        "resourceType": "ec2",
        "name": "web-server",
        "icon": "ec2-icon",
        "position": { "x": 100, "y": 100 },
        "configuration": {
          "ami": "ami-0c02fb55956c7d316",
          "instance_type": "t3.micro",
          "associate_public_ip_address": true
        }
      },
      {
        "id": "node-2",
        "nodeType": "awsService",
        "resourceType": "security-group",
        "name": "web-sg",
        "icon": "sg-icon",
        "position": { "x": 300, "y": 100 },
        "configuration": {
          "description": "Security group for web server",
          "ingress": [
            {
              "from_port": 80,
              "to_port": 80,
              "protocol": "tcp",
              "cidr_blocks": ["0.0.0.0/0"]
            }
          ]
        }
      }
    ],
    "connections": [
      {
        "id": "conn-1",
        "source": "node-1",
        "target": "node-2"
      }
    ]
  },
  "projectName": "web-app"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "terraformCode": "# Generated Terraform Configuration\n\nprovider \"aws\" {\n  region = \"us-east-1\"\n}\n\n...",
    "filename": "web-app-2025-09-07T10-30-00-000Z.tf",
    "outputPath": "src/output/web-app-2025-09-07T10-30-00-000Z.tf",
    "generatedAt": "2025-09-07T10:30:00.000Z"
  },
  "message": "Terraform configuration generated successfully",
  "timestamp": "2025-09-07T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request body or validation error
- `500` - Server error

---

### Generate Terraform from Raw Config

Generate Terraform from raw JSON configuration (for testing and legacy support).

**Endpoint:** `POST /api/generate-terraform-raw`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "provider": {
    "aws": {
      "region": "string (required)"
    }
  },
  "variable": {
    "variable_name": {
      "description": "string (optional)",
      "type": "string (optional)",
      "default": "any (optional)"
    }
  },
  "locals": {
    "local_name": "any"
  },
  "data": {
    "data_source_type": {
      "data_source_name": {
        // Data source configuration
      }
    }
  },
  "resource": {
    "resource_type": {
      "resource_name": {
        // Resource configuration
      }
    }
  },
  "output": {
    "output_name": {
      "description": "string (optional)",
      "value": "string (required)"
    }
  }
}
```

**Example Request:**
```json
{
  "provider": {
    "aws": {
      "region": "us-east-1"
    }
  },
  "variable": {
    "environment": {
      "description": "Environment name",
      "type": "string",
      "default": "dev"
    }
  },
  "resource": {
    "aws_instance": {
      "web_server": {
        "ami": "ami-0c02fb55956c7d316",
        "instance_type": "t3.micro",
        "tags": {
          "Name": "WebServer",
          "Environment": "var.environment"
        }
      }
    },
    "aws_security_group": {
      "web_sg": {
        "name": "web-security-group",
        "description": "Security group for web server",
        "ingress": [
          {
            "from_port": 80,
            "to_port": 80,
            "protocol": "tcp",
            "cidr_blocks": ["0.0.0.0/0"]
          }
        ]
      }
    }
  },
  "output": {
    "instance_public_ip": {
      "description": "Public IP of the web server",
      "value": "aws_instance.web_server.public_ip"
    }
  }
}
```

**Query Parameters:**
- `projectName` (optional): Name for the generated file (default: "infrastructure")

**Response:**
```json
{
  "success": true,
  "data": {
    "terraformCode": "# Generated Terraform Configuration\n\nprovider \"aws\" {\n  region = \"us-east-1\"\n}\n\n...",
    "filename": "infrastructure-2025-09-07T10-30-00-000Z.tf",
    "outputPath": "src/output/infrastructure-2025-09-07T10-30-00-000Z.tf",
    "generatedAt": "2025-09-07T10:30:00.000Z"
  },
  "message": "Terraform configuration generated successfully",
  "timestamp": "2025-09-07T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid JSON configuration
- `500` - Server error

---

### List Terraform Files

Get a list of all generated Terraform files.

**Endpoint:** `GET /api/terraform-files`

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "name": "web-app-2025-09-07T10-30-00-000Z.tf",
        "path": "src/output/web-app-2025-09-07T10-30-00-000Z.tf",
        "size": 1024,
        "createdAt": "2025-09-07T10:30:00.000Z",
        "modifiedAt": "2025-09-07T10:30:00.000Z"
      },
      {
        "name": "infrastructure-2025-09-07T09-15-30-000Z.tf",
        "path": "src/output/infrastructure-2025-09-07T09-15-30-000Z.tf",
        "size": 2048,
        "createdAt": "2025-09-07T09:15:30.000Z",
        "modifiedAt": "2025-09-07T09:15:30.000Z"
      }
    ]
  },
  "timestamp": "2025-09-07T10:30:00.000Z"
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
    "filename": "web-app-2025-09-07T10-30-00-000Z.tf",
    "content": "# Generated Terraform Configuration\n\nprovider \"aws\" {\n  region = \"us-east-1\"\n}\n\n...",
    "downloadUrl": "/api/terraform-files/web-app-2025-09-07T10-30-00-000Z.tf/download"
  },
  "timestamp": "2025-09-07T10:30:00.000Z"
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

## Resource Type Mapping

When using the structured architecture data, the following resource types are automatically mapped:

| Frontend Type | Terraform Resource |
|---------------|-------------------|
| `ec2`, `aws-ec2`, `instance` | `aws_instance` |
| `vpc`, `aws-vpc` | `aws_vpc` |
| `subnet`, `aws-subnet` | `aws_subnet` |
| `s3`, `aws-s3`, `bucket` | `aws_s3_bucket` |
| `rds`, `aws-rds`, `database` | `aws_db_instance` |
| `lambda`, `aws-lambda`, `function` | `aws_lambda_function` |
| `alb`, `aws-alb`, `load-balancer`, `elb` | `aws_lb` |
| `security-group`, `aws-security-group`, `sg` | `aws_security_group` |
| `iam-role`, `aws-iam-role`, `role` | `aws_iam_role` |

## Error Codes

### Validation Errors (400)

- Missing required fields in request body
- Invalid architecture data structure
- Invalid filename format
- Invalid JSON configuration

### Not Found Errors (404)

- Terraform file not found
- Invalid API endpoint

### Server Errors (500)

- Terraform generation failure
- File system errors
- Unexpected server errors

## Rate Limiting

Currently, there are no rate limits applied. This may be added in future versions for production deployments.

## CORS

CORS is enabled for all origins in development mode. For production, configure the `CORS_ORIGIN` environment variable.

## Examples

### Complete Workflow Example

1. **Generate Terraform from architecture data:**
```bash
curl -X POST http://localhost:5000/api/generate-terraform \
  -H "Content-Type: application/json" \
  -d '{
    "architectureData": {
      "metadata": {
        "name": "web-app",
        "version": "1.0.0",
        "createdAt": "2025-09-07T10:30:00.000Z",
        "lastModified": "2025-09-07T10:30:00.000Z",
        "provider": "aws"
      },
      "nodes": [
        {
          "id": "web-server",
          "nodeType": "awsService",
          "resourceType": "ec2",
          "name": "web-server",
          "icon": "ec2",
          "position": {"x": 100, "y": 100},
          "configuration": {
            "ami": "ami-0c02fb55956c7d316",
            "instance_type": "t3.micro"
          }
        }
      ],
      "connections": []
    },
    "projectName": "my-web-app"
  }'
```

2. **List generated files:**
```bash
curl http://localhost:5000/api/terraform-files
```

3. **Get file content:**
```bash
curl http://localhost:5000/api/terraform-files/my-web-app-2025-09-07T10-30-00-000Z.tf
```

4. **Download file:**
```bash
curl -o terraform-config.tf http://localhost:5000/api/terraform-files/my-web-app-2025-09-07T10-30-00-000Z.tf/download
```

## SDK Examples

### JavaScript/TypeScript

```typescript
class DarchBackendClient {
  constructor(private baseUrl: string = 'http://localhost:5000') {}

  async generateTerraform(architectureData: any, projectName?: string) {
    const response = await fetch(`${this.baseUrl}/api/generate-terraform`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ architectureData, projectName }),
    });
    return response.json();
  }

  async listFiles() {
    const response = await fetch(`${this.baseUrl}/api/terraform-files`);
    return response.json();
  }

  async getFileContent(filename: string) {
    const response = await fetch(`${this.baseUrl}/api/terraform-files/${filename}`);
    return response.json();
  }

  async downloadFile(filename: string) {
    const response = await fetch(`${this.baseUrl}/api/terraform-files/${filename}/download`);
    return response.blob();
  }
}
```

### Python

```python
import requests
import json

class DarchBackendClient:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url

    def generate_terraform(self, architecture_data, project_name=None):
        payload = {
            "architectureData": architecture_data,
            "projectName": project_name
        }
        response = requests.post(
            f"{self.base_url}/api/generate-terraform",
            json=payload
        )
        return response.json()

    def list_files(self):
        response = requests.get(f"{self.base_url}/api/terraform-files")
        return response.json()

    def get_file_content(self, filename):
        response = requests.get(f"{self.base_url}/api/terraform-files/{filename}")
        return response.json()

    def download_file(self, filename):
        response = requests.get(f"{self.base_url}/api/terraform-files/{filename}/download")
        return response.content
```
