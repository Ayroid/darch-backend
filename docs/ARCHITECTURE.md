# Architecture Documentation

This document provides a detailed overview of the Darch Backend architecture, design patterns, and implementation details.

## Table of Contents

- [Overview](#overview)
- [Architecture Pattern](#architecture-pattern)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Design Decisions](#design-decisions)
- [File Structure](#file-structure)
- [Technology Stack](#technology-stack)
- [Security Considerations](#security-considerations)

## Overview

The Darch Backend is designed as a robust, scalable TypeScript application that converts AWS architecture diagrams into valid Terraform configurations. It follows clean architecture principles with clear separation of concerns and modular design.

## Architecture Pattern

### MVC (Model-View-Controller) Pattern

The application follows a modified MVC pattern adapted for API services:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client/API    │    │   Controllers   │    │    Services     │
│   (HTTP Layer)  │◄──►│  (Coordination) │◄──►│ (Business Logic)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                ▲                        ▲
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │     Views       │    │     Models      │
                       │   (Response     │    │   (Data Layer)  │
                       │   Formatting)   │    │                 │
                       └─────────────────┘    └─────────────────┘
```

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routes    │  │ Controllers │  │    Middleware       │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                      Business Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Services   │  │    Utils    │  │   TerraformGen      │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Models    │  │    Views    │  │    File System      │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Application Layer

#### App.ts
- **Purpose**: Main application entry point and Express.js configuration
- **Responsibilities**:
  - Server initialization and configuration
  - Middleware registration
  - Route mounting
  - Error handling setup
  - CORS configuration

```typescript
export class App {
  private app: express.Application;
  private port: number;
  
  constructor() {
    this.app = express();
    this.port = ConfigUtils.getPort();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }
}
```

### 2. Presentation Layer

#### Controllers
- **Purpose**: Handle HTTP requests and coordinate business logic
- **Pattern**: Controller pattern with static methods
- **Responsibilities**:
  - Request validation
  - Service orchestration
  - Response formatting
  - Error handling

```typescript
export class TerraformController {
  static async generateTerraform(req: Request, res: Response): Promise<void> {
    // Coordinate between services and return response
  }
}
```

#### Routes
- **Purpose**: Define API endpoints and map to controllers
- **Pattern**: Express Router with modular route definitions
- **Structure**:
  - `index.ts`: Main router that mounts sub-routers
  - `healthRoutes.ts`: Health check endpoints
  - `apiRoutes.ts`: Main API endpoints

#### Middleware
- **Purpose**: Cross-cutting concerns and request processing
- **Types**:
  - **Logging**: Request/response logging
  - **Validation**: Input validation and sanitization
  - **Error Handling**: Global error handling and 404 handling
  - **Security**: CORS, input sanitization

### 3. Business Layer

#### Services
Core business logic components:

##### TerraformConfigService
- **Purpose**: Convert architecture data to Terraform configuration
- **Key Features**:
  - Resource type mapping
  - Configuration transformation
  - Default value injection
  - Resource relationship handling

##### FileService
- **Purpose**: File operations and Terraform generation
- **Key Features**:
  - File generation with unique naming
  - File listing and metadata
  - Content retrieval
  - Download handling

##### CLIService
- **Purpose**: Command-line interface functionality
- **Key Features**:
  - Legacy CLI support
  - Template processing
  - Batch operations

#### Terraform Generator
- **Purpose**: Core Terraform code generation engine
- **Architecture**: AST-based generation
- **Key Features**:
  - Syntax-aware code generation
  - Modern Terraform syntax (v0.12+)
  - Type-safe value formatting
  - Block attribute handling
  - Reference resolution

```typescript
class TerraformGenerator {
  private blocks: TerraformBlock[] = [];
  
  constructor(private jsonConfig: any) {
    this.parseJsonToBlocks();
  }
  
  public generateTerraform(): string {
    // Generate HCL code
  }
}
```

### 4. Data Layer

#### Models
- **Purpose**: Type definitions and data structures
- **Pattern**: TypeScript interfaces and types
- **Key Models**:
  - `ArchitectureData`: Frontend architecture representation
  - `TerraformFile`: Generated file metadata
  - `ApiResponse`: Standardized API responses

#### Views
- **Purpose**: Response formatting and presentation
- **Pattern**: Static factory methods for response creation
- **Features**:
  - Consistent response format
  - Error response standardization
  - Success response wrapping

### 5. Utility Layer

#### ConfigUtils
- **Purpose**: Environment and configuration management
- **Features**:
  - Environment variable handling
  - Default value management
  - Type-safe configuration

#### ValidationUtils
- **Purpose**: Input validation and data integrity
- **Features**:
  - Schema validation
  - Required field checking
  - Data type validation

## Data Flow

### 1. Terraform Generation Flow

```
┌─────────────┐    ┌─────────────────┐    ┌───────────────────┐
│   Client    │    │   Controller    │    │    Services       │
│   Request   │───►│   Validation    │───►│   Conversion      │
└─────────────┘    └─────────────────┘    └───────────────────┘
                                                    │
                                                    ▼
┌─────────────┐    ┌─────────────────┐    ┌───────────────────┐
│  Response   │    │   File System   │    │ Terraform         │
│  Formatting │◄───│   Operations    │◄───│ Generator         │
└─────────────┘    └─────────────────┘    └───────────────────┘
```

### 2. Request Processing Pipeline

```
HTTP Request
     │
     ▼
┌─────────────────┐
│   CORS Check    │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│   Body Parsing  │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│    Logging      │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│    Routing      │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│   Validation    │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│   Controller    │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│    Service      │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│   Response      │
└─────────────────┘
```

## Design Decisions

### 1. TypeScript Choice
- **Reason**: Type safety, better IDE support, compile-time error detection
- **Benefits**: Reduced runtime errors, better maintainability, enhanced developer experience

### 2. AST-based Terraform Generation
- **Reason**: More reliable than template-based generation
- **Benefits**: 
  - Syntax-aware generation
  - Better error handling
  - Easier to extend and maintain
  - No interpolation issues

### 3. Modular Architecture
- **Reason**: Separation of concerns, testability, maintainability
- **Benefits**:
  - Easy to test individual components
  - Clear responsibility boundaries
  - Easier to modify and extend

### 4. Static Methods in Controllers
- **Reason**: Simplicity and statelessness
- **Benefits**: No need for dependency injection, easier testing, functional approach

### 5. File-based Output Storage
- **Reason**: Simplicity and direct access
- **Alternative Considered**: Database storage
- **Benefits**: Easy to implement, direct file access, no additional dependencies

## File Structure

```
src/
├── models/                 # Data structures and interfaces
│   ├── Architecture.ts     # Architecture data models
│   └── Response.ts         # API response models
├── views/                  # Response formatting
│   └── ResponseView.ts     # Standardized response factory
├── controllers/            # Request handlers
│   ├── HealthController.ts # Health check controller
│   └── TerraformController.ts # Terraform operations controller
├── services/               # Business logic
│   ├── TerraformConfigService.ts # Config conversion service
│   ├── FileService.ts      # File operations service
│   └── CLIService.ts       # CLI functionality service
├── routes/                 # API endpoints
│   ├── index.ts           # Main router
│   ├── healthRoutes.ts    # Health endpoints
│   └── apiRoutes.ts       # API endpoints
├── middleware/             # Express middleware
│   ├── ErrorMiddleware.ts  # Error handling
│   ├── LoggingMiddleware.ts # Request logging
│   └── ValidationMiddleware.ts # Input validation
├── utils/                  # Utility functions
│   ├── ConfigUtils.ts      # Configuration management
│   └── ValidationUtils.ts  # Validation helpers
├── data/                   # Data files
│   ├── infra-templates/    # Template files
│   └── output/            # Generated files
├── terraform-generator.ts  # Core generation engine
├── exports.ts             # Public API exports
├── App.ts                 # Main application class
└── index.ts               # Application entry point
```

## Technology Stack

### Core Technologies
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.8+
- **Framework**: Express.js 5.1+
- **Build Tool**: TypeScript Compiler (tsc)

### Development Dependencies
- **Type Definitions**: @types/* packages for type safety
- **Development Server**: Nodemon for hot reloading
- **Process Manager**: ts-node for TypeScript execution

### Production Dependencies
- **HTTP Framework**: Express.js with CORS support
- **Template Engine**: Handlebars (legacy support)
- **Status Codes**: http-status-codes for standardized responses
- **Environment**: dotenv for configuration

### Deployment
- **Containerization**: Docker with multi-stage builds
- **Process Management**: PM2 (recommended for production)
- **Reverse Proxy**: Nginx (recommended)

## Security Considerations

### 1. Input Validation
- All inputs are validated using middleware
- Type checking with TypeScript
- Sanitization to prevent injection attacks

### 2. File System Security
- Path traversal prevention in file operations
- Filename validation for downloads
- Sandboxed output directory

### 3. CORS Configuration
- Configurable origins for production
- Credentials handling disabled by default
- Environment-based configuration

### 4. Error Handling
- No sensitive information in error responses
- Proper error logging for debugging
- Graceful degradation

### 5. Rate Limiting (Recommended)
- Not currently implemented
- Should be added for production deployments
- Consider using express-rate-limit

## Scalability Considerations

### 1. Horizontal Scaling
- Stateless design allows for multiple instances
- File-based storage may need shared storage in clusters
- Consider moving to object storage (S3) for production

### 2. Performance Optimization
- Async/await throughout for non-blocking operations
- Efficient file operations
- Memory management for large configurations

### 3. Monitoring and Observability
- Structured logging with timestamps
- Request/response tracking
- Health check endpoint for load balancers

## Extension Points

### 1. Adding New Cloud Providers
1. Extend resource type mapping in `TerraformConfigService`
2. Add provider-specific templates
3. Update validation rules
4. Add provider-specific configuration handling

### 2. Adding New Features
1. Define new interfaces in `models/`
2. Add business logic in `services/`
3. Create controller methods
4. Add routes and validation
5. Update documentation

### 3. Custom Output Formats
1. Extend the generator interface
2. Add new generator implementations
3. Update service layer to handle different formats
4. Add format selection to API

## Testing Strategy

### 1. Unit Testing (Recommended)
- Test individual functions and methods
- Mock external dependencies
- Focus on business logic in services

### 2. Integration Testing (Recommended)
- Test API endpoints end-to-end
- Validate file generation
- Test error scenarios

### 3. Contract Testing (Recommended)
- Validate API response schemas
- Ensure backward compatibility
- Test with frontend integration

### 4. Manual Testing
- Use provided curl examples
- Test with Postman or similar tools
- Validate generated Terraform with `terraform validate`

## Future Enhancements

### 1. Database Integration
- Move from file-based to database storage
- Add user management and authentication
- Project management features

### 2. Real-time Features
- WebSocket support for real-time updates
- Progress tracking for large generations
- Live collaboration features

### 3. Advanced Terraform Features
- Module support
- State management
- Plan and apply integration
- Terraform Cloud integration

### 4. Monitoring and Analytics
- Usage analytics
- Performance monitoring
- Error tracking and alerting
- Resource usage optimization
