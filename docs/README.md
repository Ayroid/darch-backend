# Darch Backend

A robust TypeScript backend for generating enterprise-grade modular Terraform configurations from AWS architecture diagrams. Built with Express.js and featuring a comprehensive module registry system.

## 🚀 Features

### Core Capabilities
- **Modular Terraform Generation**: Convert AWS architecture data to enterprise-grade, modular Terraform configurations
- **Module Registry System**: Comprehensive library of validated Terraform modules for networking, compute, security, and storage
- **Architecture Validation**: Advanced validation engine with dependency checking and circular dependency detection
- **RESTful API**: Clean, unified endpoints for frontend integration
- **Dependency Resolution**: Automatic dependency ordering with topological sorting
- **Plan Preview**: Cost estimation and resource summaries before deployment
- **File Management**: Generate, organize, and download complete Terraform projects
- **CLI Support**: Command-line interface for automation and CI/CD integration
- **Docker Ready**: Fully containerized environment for consistent deployments

### ✨ Latest Enhancements (v2.1.0)
- **🆕 Enhanced Networking Support**: Complete Internet Gateway and Route Table module support
- **🧪 Comprehensive Testing**: 60+ unit tests covering services, utilities, and edge cases
- **🔧 Improved Resource Mapping**: Fixed critical gaps for `aws-internet-gateway` and `aws-route-table` resources
- **⚡ Enhanced Validation**: Advanced dependency resolution for complex networking topologies
- **📚 Updated Documentation**: Complete documentation refresh with implementation guides

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Documentation](#documentation)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 📚 Documentation

Complete documentation is available in the [`docs/`](./docs/) folder:

- **[📚 Documentation Index](./docs/README.md)** - Complete documentation overview
- **[🔌 API Reference](./docs/API.md)** - Detailed API documentation
- **[🏗️ Architecture Guide](./docs/ARCHITECTURE.md)** - System architecture overview
- **[⚙️ Development Guide](./docs/DEVELOPMENT.md)** - Development setup and workflow
- **[🚀 Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment instructions

For quick API reference, see the sections below, or visit the [complete API documentation](./docs/API.md).

## 🛠 Installation

### Prerequisites

- Node.js 18+ and npm
- Docker (optional, for containerized testing)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ayroid/Darch-Backend.git
   cd Darch-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

## 🚀 Quick Start

### Server Mode (Default)

Start the Express server:

```bash
npm start
```

The server will start on `http://localhost:5000` with the following endpoints available:

- **Health Check**: `GET /health`
- **Terraform Generation**: `POST /api/generate-terraform`
- **Module Management**: `GET /api/modules`
- **Architecture Validation**: `POST /api/validate/architecture`

### CLI Mode

Run in command-line mode for batch processing:

```bash
npm run cli
```

### Development Mode

Start with hot reloading:

```bash
npm run dev
```

## 📚 API Documentation

### Health Check

**GET** `/health`

Returns server health status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-09-07T10:30:00.000Z"
}
```

### 🏗️ Terraform Generation

#### Generate Modular Terraform

**POST** `/api/generate-terraform`

Generate enterprise-grade modular Terraform configuration from architecture data with automatic dependency resolution.

**Request Body:**
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
      "mainTf": "# Generated Terraform Configuration\n...",
      "variablesTf": "# Variables Configuration\n...",
      "outputsTf": "# Outputs Configuration\n...",
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
    "moduleMapping": {
      "modulesGenerated": 3,
      "dependencies": 2,
      "warnings": []
    }
  },
  "message": "Modular Terraform configuration generated successfully"
}
```

#### Generate Terraform Plan Preview

**POST** `/api/terraform/plan`

Generate a preview of resources and estimated costs before deployment.

**Request Body:** Same as generate-terraform

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
      "disclaimer": "This is a rough estimate. Actual costs may vary."
    },
    "dependencies": 2,
    "warnings": []
  }
}
```

### 📦 Module Management

#### Get Available Modules

**GET** `/api/modules`

List all available Terraform modules in the registry.

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
        "outputs": ["vpc_id", "vpc_cidr_block"]
      }
    ],
    "modulesByCategory": {
      "networking": [...],
      "compute": [...],
      "security": [...],
      "storage": [...]
    },
    "totalModules": 12,
    "categories": ["networking", "compute", "security", "storage"]
  }
}
```

#### Get Module Details

**GET** `/api/modules/:category/:name`

Get detailed information about a specific module.

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
      "variables": [...],
      "outputs": [...]
    },
    "metadata": {
      "author": "Darch Team",
      "documentation": "https://docs.darch.dev/modules/vpc",
      "examples": [...]
    }
  }
}
```

#### Validate Module Configuration

**POST** `/api/modules/validate`

Validate a module configuration before using it.

**Request Body:**
```json
{
  "category": "networking",
  "name": "vpc",
  "configuration": {
    "cidr_block": "10.0.0.0/16",
    "enable_dns_hostnames": true
  }
}
```

#### Refresh Module Registry

**POST** `/api/modules/refresh`

Refresh the module registry to load new or updated modules.

### 🔍 Architecture Validation

#### Validate Architecture Design

**POST** `/api/validate/architecture`

Validate the overall architecture design for best practices and compatibility.

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
          "severity": "medium"
        }
      ]
    },
    "nodes": 3,
    "connections": 2
  }
}
```

#### Validate Dependencies

**POST** `/api/validate/dependencies`

Validate resource dependencies and detect circular dependencies.

**Response:**
```json
{
  "success": true,
  "data": {
    "dependencyGraph": {
      "nodes": [...],
      "edges": [...]
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
  }
}
```

### 📁 File Management

#### List Terraform Files

**GET** `/api/terraform-files`

Get list of all generated Terraform projects.

#### Get Terraform File Content

**GET** `/api/terraform-files/:filename`

Get the content of a specific Terraform file.

#### Download Terraform File

**GET** `/api/terraform-files/:filename/download`

Download a Terraform file as an attachment.

For complete API documentation with detailed examples, see [API Reference](./docs/API.md).

## 🏗 Architecture Overview

The Darch Backend features a modular, service-oriented architecture with comprehensive Terraform module support. Key components include:

- **TerraformController**: Unified API controller
- **ModuleRegistryService**: Terraform module management
- **ArchitectureParserService**: Architecture validation
- **ModularTerraformGeneratorService**: Code generation

For detailed architecture documentation, see [Architecture Guide](./docs/ARCHITECTURE.md) and [Modular Architecture](./docs/MODULAR_ARCHITECTURE.md).

## 🧪 Testing

### Quick Testing
```bash
# Start server
npm start

# Health check
curl http://localhost:5000/health

# Run comprehensive tests
chmod +x test-modular.sh
./test-modular.sh
```

For complete testing documentation, see [Testing Guide](./docs/TESTING.md).

## ⚙️ Configuration

### Environment Variables
```env
NODE_ENV=development
PORT=5000
CORS_ORIGIN=*
```

For detailed configuration options, see [Development Guide](./docs/DEVELOPMENT.md).

## 🚀 Deployment

### Quick Deployment
```bash
# Production build
npm run build
npm start

# Docker deployment
docker build -t darch-backend .
docker run -p 5000:5000 darch-backend
```

For complete deployment instructions, see [Deployment Guide](./docs/DEPLOYMENT.md).

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./docs/CONTRIBUTING.md) for detailed information on:

- Code style guidelines
- Pull request process
- Testing requirements
- Documentation standards

### Quick Contributing Steps

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add appropriate error handling
- Update documentation for new features
- Test your changes thoroughly
- Follow the existing code style

## 📄 License

This project is licensed under the ISC License.

## 📞 Support

For support and questions:

- **General Issues**: Create an issue on GitHub
- **Documentation**: Check the [docs folder](./docs/) for comprehensive guides
- **Security Issues**: See our [Security Policy](./docs/SECURITY.md)
- **API Questions**: Review the [API documentation](./docs/API.md)
- **Troubleshooting**: Check the [Development Guide](./docs/DEVELOPMENT.md#troubleshooting)

---

**Built with ❤️ for the Darch project**
