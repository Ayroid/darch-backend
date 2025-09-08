# Darch Backend

A robust TypeScript backend for generating enterprise-grade modular Terraform configurations from AWS architecture diagrams. Built with Express.js and featuring a comprehensive module registry system.

## 🚀 Features

- **Modular Terraform Generation**: Convert AWS architecture data to enterprise-grade, modular Terraform configurations
- **Module Registry System**: Comprehensive library of validated Terraform modules for networking, compute, security, and storage
- **Architecture Validation**: Advanced validation engine with dependency checking and circular dependency detection
- **RESTful API**: Clean, unified endpoints for frontend integration
- **Dependency Resolution**: Automatic dependency ordering with topological sorting
- **Plan Preview**: Cost estimation and resource summaries before deployment
- **File Management**: Generate, organize, and download complete Terraform projects
- **CLI Support**: Command-line interface for automation and CI/CD integration
- **Docker Ready**: Fully containerized environment for consistent deployments

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Modular Architecture](#modular-architecture)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

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

## 🏗 Modular Architecture

The backend features a comprehensive modular Terraform architecture:

```
src/
├── controllers/         # Request handlers
│   ├── HealthController.ts
│   └── TerraformController.ts  # Unified controller for all Terraform operations
├── services/            # Business logic
│   ├── ModuleRegistryService.ts      # Module discovery and validation
│   ├── ArchitectureParserService.ts  # Architecture parsing and validation
│   ├── ModuleMapperService.ts        # Architecture to module mapping
│   ├── ModularTerraformGeneratorService.ts  # Terraform generation
│   ├── FileService.ts                # File management
│   └── CLIService.ts                 # CLI interface
├── terraform-modules/   # Module registry
│   ├── networking/      # VPC, subnet, gateway modules
│   ├── compute/         # EC2, auto-scaling modules
│   ├── security/        # Security group, IAM modules
│   └── storage/         # S3, EBS modules
├── models/              # Data structures and interfaces
│   ├── Architecture.ts  # Architecture and validation interfaces
│   └── Response.ts      # API response interfaces
├── routes/              # API endpoints
│   ├── index.ts
│   ├── healthRoutes.ts
│   └── apiRoutes.ts
├── middleware/          # Express middleware
│   ├── ErrorMiddleware.ts
│   ├── LoggingMiddleware.ts
│   └── ValidationMiddleware.ts
├── utils/               # Utility functions
│   ├── ConfigUtils.ts
│   └── ValidationUtils.ts
└── views/               # Response formatting
    └── ResponseView.ts  # Standardized API responses
```

### 🏗️ Terraform Module Registry

The system includes a comprehensive module registry:

#### Networking Modules
- **VPC**: Virtual Private Cloud with DNS configuration
- **Subnet**: Public/private subnets with availability zone support
- **Internet Gateway**: Internet connectivity for public subnets
- **NAT Gateway**: Outbound internet for private subnets

#### Compute Modules
- **EC2**: Elastic Compute instances with security group integration
- **Auto Scaling**: Auto scaling groups with launch templates
- **Load Balancer**: Application and network load balancers

#### Security Modules
- **Security Group**: Firewall rules with ingress/egress configuration
- **IAM Role**: Identity and access management
- **Key Pair**: SSH key management

#### Storage Modules
- **S3**: Object storage with bucket policies
- **EBS**: Elastic block storage volumes

### Key Components

- **TerraformController**: Unified controller handling all Terraform operations
- **ModuleRegistryService**: Manages the library of Terraform modules
- **ArchitectureParserService**: Parses and validates architecture designs
- **ModuleMapperService**: Maps architecture to appropriate modules with dependency resolution
- **ModularTerraformGeneratorService**: Generates modular Terraform configurations
- **ValidationMiddleware**: Comprehensive input validation and security checks
- **ResponseView**: Standardized API response formatting

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=5000
CORS_ORIGIN=*
```

### Available Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Application environment |
| `PORT` | `5000` | Server port |
| `CORS_ORIGIN` | `*` | CORS allowed origins |

## 🛠 Development

### Project Scripts

```bash
# Build TypeScript
npm run build

# Start production server
npm start

# Start development server with hot reload
npm run dev

# Run CLI mode
npm run cli

# Build and run Docker container
npm run docker:build
npm run docker:run
npm run docker:test
```

### Code Style

The project uses TypeScript with strict type checking. Follow these conventions:

- Use PascalCase for classes and interfaces
- Use camelCase for variables and functions
- Use kebab-case for file names (except TypeScript files)
- Add JSDoc comments for public methods
- Export interfaces and types from model files

### Adding New Endpoints

1. Define the interface in `src/models/`
2. Create controller method in `src/controllers/`
3. Add route in `src/routes/`
4. Add validation in `src/middleware/ValidationMiddleware.ts`
5. Update documentation

## 🧪 Testing

### Manual Testing

Test the health endpoint:
```bash
curl http://localhost:5000/health
```

Test module listing:
```bash
curl http://localhost:5000/api/modules
```

Test architecture validation:
```bash
curl -X POST http://localhost:5000/api/validate/architecture \
  -H "Content-Type: application/json" \
  -d '{
    "architectureData": {
      "metadata": {
        "name": "test-infrastructure",
        "provider": "aws",
        "region": "us-east-1"
      },
      "nodes": [
        {
          "id": "vpc-1",
          "name": "Test VPC",
          "resourceType": "vpc",
          "configuration": {
            "cidr_block": "10.0.0.0/16"
          }
        }
      ],
      "connections": []
    }
  }'
```

Test Terraform generation:
```bash
curl -X POST http://localhost:5000/api/generate-terraform \
  -H "Content-Type: application/json" \
  -d '{
    "architectureData": {
      "metadata": {
        "name": "production-infra",
        "provider": "aws",
        "region": "us-east-1"
      },
      "nodes": [
        {
          "id": "vpc-1",
          "name": "Main VPC",
          "resourceType": "vpc",
          "configuration": {
            "cidr_block": "10.0.0.0/16",
            "enable_dns_hostnames": true
          }
        }
      ],
      "connections": []
    },
    "projectName": "test-project"
  }'
```

### Automated Testing

Run the comprehensive test suite:
```bash
chmod +x test-modular.sh
./test-modular.sh
```

### Docker Testing

```bash
# Build and test in container
npm run docker:test

# Or manually
docker build -t terraform-generator .
docker run --rm terraform-generator
```

### Terraform Validation

Use the included validation script:
```bash
chmod +x validate-terraform-syntax.sh
./validate-terraform-syntax.sh
```

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Docker Deployment

```bash
docker build -t darch-backend .
docker run -p 5000:5000 -e NODE_ENV=production darch-backend
```

### Environment Setup

For production deployment:

1. Set `NODE_ENV=production`
2. Configure proper CORS origins
3. Set up process management (PM2, systemd)
4. Configure reverse proxy (nginx)
5. Set up SSL certificates

## 🔧 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

**TypeScript compilation errors:**
```bash
# Clean build
rm -rf dist/
npm run build
```

**Template files not found:**
- Ensure template files are in `src/data/infra-templates/aws/`
- Check file permissions
- Verify JSON syntax in template files

### Debug Mode

Enable detailed logging:
```bash
NODE_ENV=development npm start
```

## 🤝 Contributing

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

- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation

---

**Built with ❤️ for the Darch project**
