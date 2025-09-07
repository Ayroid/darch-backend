# Darch Backend

A robust TypeScript backend for converting AWS architecture diagrams into valid Terraform configurations. Built with Express.js and following MVC architecture patterns.

## 🚀 Features

- **Terraform Generation**: Convert AWS architecture data to valid Terraform configurations
- **AST-based Generator**: Robust Terraform code generation with proper syntax handling
- **RESTful API**: Well-defined endpoints for frontend integration
- **File Management**: Generate, list, and download Terraform files
- **Validation**: Comprehensive input validation and error handling
- **CLI Support**: Command-line interface for batch processing
- **Docker Ready**: Containerized environment for testing and deployment

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
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
- **API Base**: `/api/*`

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

### Generate Terraform from Architecture Data

**POST** `/api/generate-terraform`

Generate Terraform configuration from structured architecture data.

**Request Body:**
```json
{
  "architectureData": {
    "metadata": {
      "name": "my-infrastructure",
      "description": "Sample AWS infrastructure",
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
          "instance_type": "t3.micro"
        }
      }
    ],
    "connections": []
  },
  "projectName": "my-project"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "terraformCode": "# Generated Terraform Configuration\n...",
    "filename": "my-project-2025-09-07T10-30-00-000Z.tf",
    "outputPath": "src/output/my-project-2025-09-07T10-30-00-000Z.tf",
    "generatedAt": "2025-09-07T10:30:00.000Z"
  },
  "message": "Terraform configuration generated successfully",
  "timestamp": "2025-09-07T10:30:00.000Z"
}
```

### Generate Terraform from Raw Config

**POST** `/api/generate-terraform-raw`

Generate Terraform from raw JSON configuration (for testing and legacy support).

**Request Body:**
```json
{
  "provider": {
    "aws": {
      "region": "us-east-1"
    }
  },
  "resource": {
    "aws_instance": {
      "web_server": {
        "ami": "ami-0c02fb55956c7d316",
        "instance_type": "t3.micro"
      }
    }
  }
}
```

### List Terraform Files

**GET** `/api/terraform-files`

Get list of all generated Terraform files.

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "name": "my-project-2025-09-07T10-30-00-000Z.tf",
        "path": "src/output/my-project-2025-09-07T10-30-00-000Z.tf",
        "size": 1024,
        "createdAt": "2025-09-07T10:30:00.000Z",
        "modifiedAt": "2025-09-07T10:30:00.000Z"
      }
    ]
  }
}
```

### Get Terraform File Content

**GET** `/api/terraform-files/:filename`

Get the content of a specific Terraform file.

### Download Terraform File

**GET** `/api/terraform-files/:filename/download`

Download a Terraform file as an attachment.

## 🏗 Architecture

The backend follows a clean MVC (Model-View-Controller) architecture:

```
src/
├── models/              # Data structures and interfaces
│   ├── Architecture.ts  # Architecture and Terraform interfaces
│   └── Response.ts      # API response interfaces
├── views/               # Response formatting
│   └── ResponseView.ts  # Standardized API responses
├── controllers/         # Request handlers
│   ├── HealthController.ts
│   └── TerraformController.ts
├── services/            # Business logic
│   ├── TerraformConfigService.ts
│   ├── FileService.ts
│   └── CLIService.ts
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
├── data/                # Templates and generated files
│   ├── infra-templates/
│   └── output/
├── terraform-generator.ts  # Core Terraform generation engine
└── App.ts               # Main application class
```

### Key Components

- **TerraformGenerator**: AST-based Terraform code generation engine
- **FileService**: Handles file operations and Terraform generation
- **TerraformConfigService**: Converts architecture data to Terraform configuration
- **ValidationMiddleware**: Input validation and security checks
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

Test Terraform generation:
```bash
curl -X POST http://localhost:5000/api/generate-terraform-raw \
  -H "Content-Type: application/json" \
  -d '{"provider":{"aws":{"region":"us-east-1"}},"resource":{"aws_instance":{"test":{"ami":"ami-12345","instance_type":"t3.micro"}}}}'
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
