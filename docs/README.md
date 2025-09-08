# Darch Backend Documentation

Welcome to the Darch Backend documentation! This directory contains comprehensive documentation for the Darch Infrastructure-as-Code platform.

## 📚 Documentation Index

### Core Documentation
- **[API Reference](./API.md)** - Complete API endpoints and usage guide
- **[Architecture Overview](./ARCHITECTURE.md)** - System architecture and design principles
- **[Modular Architecture](./MODULAR_ARCHITECTURE.md)** - Modular Terraform generation system

### Development & Deployment
- **[Development Guide](./DEVELOPMENT.md)** - Setup, development workflow, and best practices
- **[Testing Guide](./TESTING.md)** - Comprehensive testing documentation
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment instructions
- **[Contributing Guidelines](./CONTRIBUTING.md)** - How to contribute to the project

### Feature Documentation
- **[Clean Format System](./CLEAN_FORMAT.md)** - Terraform clean formatting system
- **[Clean Format Summary](./CLEAN_FORMAT_SUMMARY.md)** - Summary of format improvements
- **[Frontend JSON Optimization](./FRONTEND_JSON_OPTIMIZATION.md)** - Frontend integration optimizations

### Project Information
- **[Changelog](./CHANGELOG.md)** - Version history and release notes
- **[Security](./SECURITY.md)** - Security policies and vulnerability reporting

## 🚀 Quick Start

1. **API Development**: Start with [Development Guide](./DEVELOPMENT.md)
2. **API Usage**: See [API Reference](./API.md)
3. **Testing**: Follow [Testing Guide](./TESTING.md)
4. **Architecture Understanding**: Read [Architecture Overview](./ARCHITECTURE.md)
5. **Deployment**: Follow [Deployment Guide](./DEPLOYMENT.md)

## 📋 Key Features

- **Modular Terraform Generation**: Generate infrastructure code using reusable modules
- **Architecture Validation**: Validate infrastructure designs before deployment
- **Clean Format Output**: Automatically formatted, production-ready Terraform code
- **Frontend Integration**: Optimized JSON formats for frontend applications
- **Dependency Management**: Automatic dependency resolution and validation

## 🔧 API Endpoints Overview

- `GET /health` - Health check
- `GET /api/modules` - Available Terraform modules
- `POST /api/generate-terraform` - Generate Terraform configuration
- `POST /api/validate-architecture` - Validate architecture design
- `POST /api/validate-dependencies` - Validate resource dependencies

For complete API documentation, see [API Reference](./API.md).

## 🏗️ System Architecture

The Darch Backend follows a modular, service-oriented architecture:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway    │    │   Core Services │
│   Application   │◄──►│   (Express.js)   │◄──►│   (TypeScript)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Terraform      │
                       │   Generator      │
                       └──────────────────┘
```

For detailed architecture information, see [Architecture Overview](./ARCHITECTURE.md).

## 📝 Documentation Standards

All documentation follows these standards:
- Clear, concise language
- Code examples with explanations
- Updated with each feature change
- Includes troubleshooting sections
- Cross-referenced where relevant

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for:
- Code style guidelines
- Pull request process
- Testing requirements
- Documentation standards

## 📞 Support

- **Issues**: Report bugs and feature requests via GitHub Issues
- **Security**: Report security vulnerabilities via [Security Policy](./SECURITY.md)
- **Documentation**: Submit documentation improvements via pull requests

---

*Last updated: September 9, 2025*
