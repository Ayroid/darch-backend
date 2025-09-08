# Development Guide

This guide provides comprehensive information for developers working on the Darch Backend project - a modular Terraform generation platform with enterprise-grade architecture parsing and validation capabilities.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Organization](#code-organization)
- [Modular Architecture](#modular-architecture)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Debugging](#debugging)
- [Performance](#performance)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Git** for version control
- **Docker** (optional, for containerized development)
- **VS Code** (recommended) with TypeScript extensions
- **Terraform CLI** (optional, for validating generated configurations)

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ayroid/Darch-Backend.git
   cd Darch-Backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env  # If available
   # Edit .env file with your configuration
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Verify installation:**
   ```bash
   npm start
   # Open http://localhost:5000/health in browser
   # Test modular generation: http://localhost:5000/api/modules
   ```

### Development Environment Setup

#### VS Code Configuration

Create `.vscode/settings.json`:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "editor.formatOnSave": true,
  "typescript.format.enable": true,
  "files.exclude": {
    "**/dist": true,
    "**/node_modules": true
  }
}
```

Create `.vscode/launch.json` for debugging:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/index.js",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      },
      "preLaunchTask": "npm: build"
    },
    {
      "name": "Debug CLI",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/index.js",
      "args": ["--cli"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "preLaunchTask": "npm: build"
    }
  ]
}
```

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Start development server
npm run dev

# Make changes and test
# ...

# Build and test
npm run build
npm start

# Commit changes
git add .
git commit -m "feat: add your feature description"

# Push and create PR
git push origin feature/your-feature-name
```

### 2. Available Scripts

```bash
# Development
npm run dev          # Start with hot reload (nodemon)
npm run build        # Compile TypeScript
npm start            # Start production server

# Testing Modular Features
npm run test:modules # Test module registry and generation
npm run test:arch    # Test architecture validation

# Docker
npm run docker:build # Build Docker image
npm run docker:run   # Run Docker container
npm run docker:test  # Build and test in Docker

# Utilities
npx tsc --watch      # Watch mode compilation
node dist/index.js   # Direct node execution
```

### 3. Hot Reload Development

Use `npm run dev` for the best development experience:

```bash
npm run dev
```

This will:
- Watch for TypeScript changes
- Automatically recompile
- Restart the server
- Preserve environment variables

## Code Organization

### Project Structure

```
src/
├── controllers/        # 🎮 Unified request handlers
│   └── TerraformController.ts    # Main modular controller
├── services/          # ⚙️  Business logic & orchestration
│   ├── ModuleRegistryService.ts      # Module discovery & validation
│   ├── ArchitectureParserService.ts  # Architecture parsing & validation
│   ├── ModularTerraformGeneratorService.ts  # Terraform generation
│   └── FileService.ts               # File operations
├── models/            # 🎯 Data structures & interfaces
│   ├── Architecture.ts    # Architecture data models
│   ├── Module.ts         # Module definitions
│   └── Terraform.ts      # Terraform output models
├── views/             # 📋 Response formatting
│   └── ResponseView.ts   # Standardized API responses
├── routes/            # 🛣️  API endpoints
│   └── apiRoutes.ts     # Unified route definitions
├── middleware/        # 🔄 Express middleware
│   ├── LoggingMiddleware.ts  # Request/response logging
│   └── ValidationMiddleware.ts  # Input validation
├── utils/             # 🔧 Helper functions
│   └── ValidationUtils.ts  # Validation utilities
├── templates/         # 📄 Handlebars templates
│   └── main.hbs        # Terraform generation template
├── modules/           # 📦 Module registry
│   ├── registry/       # Module metadata & schemas
│   └── templates/      # Module Terraform templates
└── App.ts             # � Main application
```

## Modular Architecture

### Module Registry System

The modular architecture is built around a comprehensive module registry that organizes cloud resources by category:

#### 1. Module Categories & Structure

```
modules/
├── networking/
│   ├── vpc/
│   │   ├── metadata.json      # Module configuration
│   │   ├── main.tf           # Terraform template
│   │   ├── variables.tf      # Input variables
│   │   └── outputs.tf        # Output values
│   ├── subnet/
│   ├── internet-gateway/
│   └── nat-gateway/
├── compute/
│   ├── ec2/
│   ├── auto-scaling-group/
│   └── load-balancer/
├── security/
│   ├── security-group/
│   ├── iam-role/
│   └── key-pair/
└── storage/
    ├── s3/
    ├── ebs/
    └── efs/
```

#### 2. Module Development Workflow

```bash
# 1. Create new module
mkdir -p src/modules/registry/compute/new-service
cd src/modules/registry/compute/new-service

# 2. Create metadata.json
cat > metadata.json << 'EOF'
{
  "name": "new-service",
  "category": "compute",
  "version": "1.0.0",
  "description": "New compute service module",
  "variables": [
    {
      "name": "instance_type",
      "type": "string",
      "description": "Instance type",
      "required": true
    }
  ],
  "outputs": [
    {
      "name": "instance_id",
      "description": "Instance ID"
    }
  ],
  "dependencies": ["vpc", "security-group"]
}
EOF

# 3. Create Terraform templates
cat > main.tf << 'EOF'
resource "aws_instance" "main" {
  instance_type = var.instance_type
  # ... configuration
}
EOF

# 4. Test module loading
npm run test:modules
```

#### 3. Architecture Processing

The system processes architecture data through multiple stages:

1. **Input Validation**: Schema validation and sanitization
2. **Architecture Parsing**: Extract resources and relationships
3. **Dependency Analysis**: Build dependency graph and detect cycles
4. **Module Mapping**: Map resources to appropriate modules
5. **Configuration Resolution**: Resolve variables and defaults
6. **Terraform Generation**: Generate complete Terraform project

#### 4. Module Registry API

```typescript
// Get all available modules
const modules = await ModuleRegistryService.getAvailableModules();

// Get modules by category
const networkingModules = await ModuleRegistryService.getModulesByCategory('networking');

// Validate module configuration
const validation = await ModuleRegistryService.validateModuleConfig(
  'vpc',
  { cidr_block: '10.0.0.0/16' }
);

// Resolve module dependencies
const dependencies = await ModuleRegistryService.resolveDependencies(['ec2', 'rds']);
```

### Adding New Components

#### 1. Adding a New Module

Create module structure:
```bash
# Create module directory
mkdir -p src/modules/registry/compute/lambda

# Create metadata.json
cat > src/modules/registry/compute/lambda/metadata.json << 'EOF'
{
  "name": "lambda",
  "category": "compute",
  "version": "1.0.0",
  "description": "AWS Lambda function with configurable runtime",
  "author": "Darch Team",
  "tags": ["serverless", "lambda", "compute"],
  "variables": [
    {
      "name": "function_name",
      "type": "string",
      "description": "Name of the Lambda function",
      "required": true,
      "validation": {
        "pattern": "^[a-zA-Z0-9-_]+$",
        "minLength": 1,
        "maxLength": 64
      }
    },
    {
      "name": "runtime",
      "type": "string",
      "description": "Lambda runtime",
      "required": true,
      "default": "nodejs18.x",
      "validation": {
        "enum": ["nodejs18.x", "python3.9", "java11", "dotnet6"]
      }
    }
  ],
  "outputs": [
    {
      "name": "function_arn",
      "description": "ARN of the Lambda function"
    },
    {
      "name": "function_name",
      "description": "Name of the Lambda function"
    }
  ],
  "dependencies": ["iam-role"],
  "cost_estimate": {
    "monthly_base": 0,
    "per_request": 0.0000002
  }
}
EOF
```

Create Terraform template:
```bash
cat > src/modules/registry/compute/lambda/main.tf << 'EOF'
resource "aws_lambda_function" "{{sanitized_name}}" {
  function_name = var.function_name
  runtime      = var.runtime
  handler      = "index.handler"
  role         = var.execution_role_arn

  filename         = "function.zip"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = var.environment_variables
  }

  tags = var.tags
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "function.zip"
  source_dir  = var.source_dir
}
EOF
```

#### 2. Adding a New Service

Create `src/services/NewService.ts`:
```typescript
import { BaseService } from './BaseService.js';
import { ValidationResult } from '../models/Validation.js';

export class NewService extends BaseService {
  /**
   * Process new service data with validation and caching
   */
  static async processData(data: NewServiceData): Promise<ProcessedData> {
    console.log('🔄 Processing new service data:', data.name);

    // Validate input
    const validation = this.validateInput(data);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors.join(', '));
    }

    // Process with caching
    const cacheKey = this.generateCacheKey(data);
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      console.log('📦 Returning cached result');
      return cached;
    }

    // Perform processing
    const result = await this.performProcessing(data);

    // Cache result
    await this.saveToCache(cacheKey, result);

    return result;
  }

  /**
   * Validate service-specific data
   */
  private static validateInput(data: NewServiceData): ValidationResult {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Name is required');
    }

    if (data.configuration && typeof data.configuration !== 'object') {
      errors.push('Configuration must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Core processing logic
   */
  private static async performProcessing(data: NewServiceData): Promise<ProcessedData> {
    // Implement business logic
    return {
      ...data,
      processedAt: new Date().toISOString(),
      metadata: {
        version: '1.0.0',
        processed: true
      }
    };
  }
}
```

#### 3. Adding a New Controller Method

Update `src/controllers/TerraformController.ts`:
```typescript
/**
 * Handle new functionality
 */
static async handleNewFunction(req: Request, res: Response): Promise<void> {
  try {
    console.log('📥 Received new function request');

    const { data } = req.body;

    // Validate request
    const validation = ValidationUtils.validateNewFunctionData(data);
    if (!validation.isValid) {
      const response = ResponseView.error(
        'Validation failed',
        validation.errors.join(', ')
      );
      res.status(400).json(response);
      return;
    }

    // Process through service
    const result = await NewService.processData(data);

    // Format response
    const response = ResponseView.success(
      result,
      'New function processed successfully'
    );
    res.json(response);

  } catch (error) {
    console.error('❌ Error in handleNewFunction:', error);

    if (error instanceof ValidationError) {
      const response = ResponseView.error('Validation error', error.message);
      res.status(400).json(response);
      return;
    }

    const response = ResponseView.error('Internal server error');
    res.status(500).json(response);
  }
}
```

#### 4. Adding Routes

Update `src/routes/apiRoutes.ts`:
```typescript
// Add new route
router.post('/new-function',
  ValidationMiddleware.validateBody(newFunctionSchema),
  TerraformController.handleNewFunction
);

router.get('/new-function/:id',
  ValidationMiddleware.validateParams(['id']),
  TerraformController.getNewFunction
);
```

## Coding Standards

### TypeScript Guidelines

#### 1. Type Safety
```typescript
// ✅ Good - Explicit types
interface UserData {
  id: string;
  name: string;
  email: string;
}

function processUser(user: UserData): Promise<UserData> {
  return Promise.resolve(user);
}

// ❌ Bad - Using 'any'
function processUser(user: any): any {
  return user;
}
```

#### 2. Naming Conventions
```typescript
// Classes: PascalCase
export class TerraformGenerator { }

// Interfaces: PascalCase with 'I' prefix (optional)
export interface ArchitectureData { }

// Functions/Methods: camelCase
static async generateTerraform(): Promise<string> { }

// Constants: UPPER_SNAKE_CASE
const DEFAULT_REGION = 'us-east-1';

// Variables: camelCase
const userData = await fetchUser();
```

#### 3. Error Handling
```typescript
// ✅ Good - Explicit error handling
try {
  const result = await riskyOperation();
  return ResponseView.success(result);
} catch (error) {
  console.error('❌ Operation failed:', error);

  if (error instanceof ValidationError) {
    return ResponseView.error('Validation failed', error.message);
  }

  return ResponseView.error('Internal server error');
}

// ❌ Bad - Ignoring errors
const result = await riskyOperation();
return result;
```

#### 4. Async/Await Usage
```typescript
// ✅ Good - Async/await for readability
static async processData(data: InputData): Promise<OutputData> {
  const validated = await validateData(data);
  const processed = await transformData(validated);
  const saved = await saveData(processed);
  return saved;
}

// ❌ Bad - Callback hell
static processData(data: InputData, callback: Function): void {
  validateData(data, (err, validated) => {
    if (err) return callback(err);

    transformData(validated, (err, processed) => {
      if (err) return callback(err);

      saveData(processed, callback);
    });
  });
}
```

### Code Organization

#### 1. Import Order
```typescript
// Node.js built-ins
import fs from 'fs';
import path from 'path';

// Third-party packages
import express from 'express';
import cors from 'cors';

// Local imports (models first, then others)
import { ArchitectureData } from '../models/Architecture.js';
import { ResponseView } from '../views/ResponseView.js';
import { TerraformService } from '../services/TerraformService.js';
```

#### 2. Class Structure
```typescript
export class ExampleClass {
  // Static properties first
  private static readonly DEFAULT_CONFIG = {};

  // Instance properties
  private readonly config: Config;
  private data: Data[];

  // Constructor
  constructor(config: Config) {
    this.config = config;
    this.data = [];
  }

  // Public static methods
  public static create(config: Config): ExampleClass {
    return new ExampleClass(config);
  }

  // Public instance methods
  public async processData(): Promise<void> {
    // Implementation
  }

  // Private methods last
  private validateConfig(): boolean {
    // Implementation
  }
}
```

### Documentation Standards

#### 1. JSDoc Comments
```typescript
/**
 * Generate Terraform configuration from architecture data
 *
 * @param architectureData - The frontend architecture data
 * @param projectName - Optional project name for the generated file
 * @returns Promise resolving to generated Terraform data
 *
 * @example
 * ```typescript
 * const result = await FileService.generateTerraformFile(
 *   architectureData,
 *   'my-project'
 * );
 * console.log(result.filename);
 * ```
 */
static async generateTerraformFile(
  architectureData: ArchitectureData,
  projectName: string = 'infrastructure'
): Promise<GeneratedTerraform> {
  // Implementation
}
```

#### 2. README Comments
```typescript
// ================================
// Resource Type Mapping
// ================================
// This section maps frontend resource types to Terraform types

// ================================
// Configuration Processing
// ================================
// Transform configuration data for Terraform compatibility
```

## Testing

### Unit Testing Setup (Recommended)

Install testing dependencies:
```bash
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ]
};
```

### Test Examples

#### 1. Service Testing
```typescript
// test/services/TerraformConfigService.test.ts
import { TerraformConfigService } from '../../src/services/TerraformConfigService';
import { ArchitectureData } from '../../src/models/Architecture';

describe('TerraformConfigService', () => {
  const mockArchitectureData: ArchitectureData = {
    metadata: {
      name: 'test-architecture',
      version: '1.0.0',
      createdAt: '2025-09-07T10:00:00.000Z',
      lastModified: '2025-09-07T10:00:00.000Z',
      provider: 'aws'
    },
    nodes: [
      {
        id: 'test-node',
        nodeType: 'awsService',
        resourceType: 'ec2',
        name: 'test-instance',
        icon: 'ec2',
        position: { x: 0, y: 0 },
        configuration: {
          ami: 'ami-12345',
          instance_type: 't3.micro'
        }
      }
    ],
    connections: []
  };

  it('should convert architecture data to terraform config', () => {
    const result = TerraformConfigService.convertArchitectureDataToTerraformConfig(
      mockArchitectureData
    );

    expect(result).toHaveProperty('provider.aws');
    expect(result).toHaveProperty('resources.aws_instance');
    expect(result.resources.aws_instance).toHaveProperty('test_instance');
  });
});
```

#### 2. API Testing
```typescript
// test/api/terraform.test.ts
import request from 'supertest';
import { App } from '../../src/App';

describe('Terraform API', () => {
  let app: Express.Application;

  beforeAll(() => {
    const appInstance = new App();
    app = appInstance.getApp();
  });

  it('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should generate terraform from raw config', async () => {
    const config = {
      provider: { aws: { region: 'us-east-1' } },
      resource: {
        aws_instance: {
          test: {
            ami: 'ami-12345',
            instance_type: 't3.micro'
          }
        }
      }
    };

    const response = await request(app)
      .post('/api/generate-terraform-raw')
      .send(config)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('terraformCode');
    expect(response.body.data).toHaveProperty('filename');
  });
});
```

### Manual Testing

#### 1. API Testing with curl
```bash
# Health check
curl http://localhost:5000/health

# Get available modules
curl http://localhost:5000/api/modules

# Get modules by category
curl http://localhost:5000/api/modules?category=networking

# Generate modular Terraform
curl -X POST http://localhost:5000/api/generate-terraform \
  -H "Content-Type: application/json" \
  -d @examples/sample-architecture.json

# Validate architecture
curl -X POST http://localhost:5000/api/validate-architecture \
  -H "Content-Type: application/json" \
  -d @examples/architecture-to-validate.json

# List generated files
curl http://localhost:5000/api/terraform-files

# Get file content
curl http://localhost:5000/api/terraform-files/your-project.tf
```

#### 2. Testing with Postman

Create a Postman collection with the following requests:

1. **Health Check**
   - Method: GET
   - URL: `{{baseUrl}}/health`

2. **Module Discovery**
   - Method: GET
   - URL: `{{baseUrl}}/api/modules`

3. **Generate Modular Terraform**
   - Method: POST
   - URL: `{{baseUrl}}/api/generate-terraform`
   - Body: Raw JSON with architecture data

4. **Validate Architecture**
   - Method: POST
   - URL: `{{baseUrl}}/api/validate-architecture`
   - Body: Raw JSON with architecture data

5. **List Files**
   - Method: GET
   - URL: `{{baseUrl}}/api/terraform-files`

## Debugging

### 1. VS Code Debugging

Set breakpoints in your TypeScript code and use F5 to start debugging.

### 2. Console Debugging

Use structured logging:
```typescript
console.log('📥 Received request:', {
  method: req.method,
  path: req.path,
  body: req.body
});

console.error('❌ Error occurred:', {
  error: error.message,
  stack: error.stack,
  context: { userId, operation }
});
```

### 3. Debug Environment Variables

```bash
# Enable detailed logging
NODE_ENV=development npm start

# Debug specific modules
DEBUG=terraform:* npm start
```

## Performance

### 1. Monitoring Performance

```typescript
// Add timing to operations
const startTime = Date.now();
const result = await expensiveOperation();
const duration = Date.now() - startTime;
console.log(`⏱️ Operation took ${duration}ms`);
```

### 2. Memory Management

```typescript
// Use streams for large files
import { createReadStream } from 'fs';

function streamLargeFile(filePath: string): NodeJS.ReadableStream {
  return createReadStream(filePath);
}

// Clean up resources
process.on('exit', () => {
  // Cleanup code
});
```

### 3. Async Best Practices

```typescript
// ✅ Good - Process items in parallel
const results = await Promise.all(
  items.map(item => processItem(item))
);

// ❌ Bad - Sequential processing
const results = [];
for (const item of items) {
  results.push(await processItem(item));
}
```

## Common Tasks

### Adding a New Cloud Provider

1. **Create Provider Module Registry**
   ```bash
   # Create provider structure
   mkdir -p src/modules/registry/providers/azure
   mkdir -p src/modules/registry/providers/gcp

   # Add provider metadata
   cat > src/modules/registry/providers/azure/metadata.json << 'EOF'
   {
     "name": "azure",
     "version": "1.0.0",
     "description": "Microsoft Azure provider modules",
     "terraform_provider": "azurerm",
     "required_version": ">= 3.0",
     "authentication": ["azure_cli", "service_principal"],
     "regions": ["eastus", "westus2", "westeurope"]
   }
   EOF
   ```

2. **Update Resource Mapping**
   ```typescript
   // In ModuleRegistryService.ts
   private static getProviderResourceMapping(provider: string): Record<string, string> {
     const mappings = {
       aws: {
         'virtual-machine': 'ec2',
         'virtual-network': 'vpc',
         'database': 'rds'
       },
       azure: {
         'virtual-machine': 'virtual-machine',
         'virtual-network': 'virtual-network',
         'database': 'sql-database'
       },
       gcp: {
         'virtual-machine': 'compute-instance',
         'virtual-network': 'vpc-network',
         'database': 'sql-database-instance'
       }
     };

     return mappings[provider] || mappings.aws;
   }
   ```

3. **Add Provider-Specific Modules**
   ```bash
   # Azure VM module
   mkdir -p src/modules/registry/compute/azure-vm
   cat > src/modules/registry/compute/azure-vm/metadata.json << 'EOF'
   {
     "name": "azure-vm",
     "category": "compute",
     "provider": "azure",
     "terraform_resource": "azurerm_virtual_machine",
     "variables": [
       {
         "name": "vm_size",
         "type": "string",
         "description": "Azure VM size",
         "required": true,
         "default": "Standard_B1s"
       }
     ]
   }
   EOF
   ```

4. **Update Architecture Parser**
   ```typescript
   // In ArchitectureParserService.ts
   static validateProvider(provider: string): boolean {
     const supportedProviders = ['aws', 'azure', 'gcp'];
     return supportedProviders.includes(provider);
   }

   static getProviderDefaults(provider: string): ProviderConfig {
     const defaults = {
       aws: { region: 'us-east-1' },
       azure: { location: 'East US' },
       gcp: { region: 'us-central1' }
     };

     return defaults[provider] || defaults.aws;
   }
   ```

### Adding Module Categories

1. **Create Category Structure**
   ```bash
   # Add new category (e.g., monitoring)
   mkdir -p src/modules/registry/monitoring

   # Add category metadata
   cat > src/modules/registry/monitoring/category.json << 'EOF'
   {
     "name": "monitoring",
     "description": "Monitoring and observability services",
     "icon": "📊",
     "modules": ["cloudwatch", "prometheus", "grafana"],
     "dependencies": ["networking"]
   }
   EOF
   ```

2. **Update Registry Service**
   ```typescript
   // In ModuleRegistryService.ts
   private static readonly CATEGORIES = [
     'networking',
     'compute',
     'security',
     'storage',
     'database',
     'monitoring',  // Add new category
     'analytics'
   ];

   static async getModulesByCategory(category: string): Promise<ModuleMetadata[]> {
     if (!this.CATEGORIES.includes(category)) {
       throw new Error(`Unsupported category: ${category}`);
     }

     return this.moduleRegistry.filter(module => module.category === category);
   }
   ```

### Adding Custom Validation Rules

1. **Create Validation Rule**
   ```typescript
   // In ValidationUtils.ts
   export class CustomValidationRules {
     /**
      * Validate AWS-specific constraints
      */
     static validateAWSConstraints(architecture: ArchitectureData): ValidationResult {
       const errors: string[] = [];

       // Check VPC CIDR blocks don't overlap
       const vpcs = architecture.nodes.filter(node => node.resourceType === 'vpc');
       for (let i = 0; i < vpcs.length; i++) {
         for (let j = i + 1; j < vpcs.length; j++) {
           if (this.cidrOverlap(vpcs[i].configuration.cidr_block, vpcs[j].configuration.cidr_block)) {
             errors.push(`VPC CIDR blocks overlap: ${vpcs[i].name} and ${vpcs[j].name}`);
           }
         }
       }

       // Validate security group rules
       const securityGroups = architecture.nodes.filter(node => node.resourceType === 'security-group');
       securityGroups.forEach(sg => {
         if (!this.validateSecurityGroupRules(sg.configuration.rules)) {
           errors.push(`Invalid security group rules in ${sg.name}`);
         }
       });

       return {
         isValid: errors.length === 0,
         errors
       };
     }
   }
   ```

2. **Integrate Custom Validation**
   ```typescript
   // In ArchitectureParserService.ts
   static async validateArchitecture(architectureData: ArchitectureData): Promise<ValidationResult> {
     // Base validation
     const baseValidation = ValidationUtils.validateArchitectureData(architectureData);
     if (!baseValidation.isValid) {
       return baseValidation;
     }

     // Provider-specific validation
     const provider = architectureData.metadata.provider;
     let providerValidation: ValidationResult = { isValid: true, errors: [] };

     switch (provider) {
       case 'aws':
         providerValidation = CustomValidationRules.validateAWSConstraints(architectureData);
         break;
       case 'azure':
         providerValidation = CustomValidationRules.validateAzureConstraints(architectureData);
         break;
     }

     // Combine results
     return {
       isValid: baseValidation.isValid && providerValidation.isValid,
       errors: [...baseValidation.errors, ...providerValidation.errors]
     };
   }
   ```

### Adding Authentication

1. **Install JWT dependencies**
   ```bash
   npm install jsonwebtoken @types/jsonwebtoken
   ```

2. **Create Auth Middleware**
   ```typescript
   // src/middleware/AuthMiddleware.ts
   import jwt from 'jsonwebtoken';

   export class AuthMiddleware {
     static authenticate(req: Request, res: Response, next: NextFunction) {
       const token = req.headers.authorization?.split(' ')[1];

       if (!token) {
         return res.status(401).json({ error: 'No token provided' });
       }

       try {
         const decoded = jwt.verify(token, process.env.JWT_SECRET!);
         req.user = decoded;
         next();
       } catch (error) {
         return res.status(401).json({ error: 'Invalid token' });
       }
     }
   }
   ```

3. **Apply to Routes**
   ```typescript
   router.post('/api/generate-terraform',
     AuthMiddleware.authenticate,
     TerraformController.generateTerraform
   );
   ```

## Troubleshooting

### Common Issues and Solutions

#### 1. TypeScript Compilation Errors

**Problem**: Module not found errors
```
Cannot find module './YourModule.js'
```

**Solution**: Ensure you're using `.js` extensions in imports:
```typescript
// ✅ Correct
import { YourModule } from './YourModule.js';

// ❌ Wrong
import { YourModule } from './YourModule';
```

#### 2. Port Already in Use

**Problem**:
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution**:
```bash
# Find and kill process using port 5000
lsof -ti:5000 | xargs kill -9

# Or use a different port
PORT=3000 npm start
```

#### 3. Template Files Not Found

**Problem**: CLI mode can't find template files

**Solution**: Ensure templates are in the correct location:
```bash
ls src/data/infra-templates/aws/
# Should show: *.json files
```

#### 4. Docker Build Issues

**Problem**: Docker build fails

**Solution**:
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t terraform-generator .
```

#### 5. Memory Issues

**Problem**: Out of memory during large operations

**Solution**:
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 dist/index.js
```

### Debug Checklist

When encountering issues:

1. ✅ Check console logs for error messages
2. ✅ Verify environment variables are set
3. ✅ Ensure all dependencies are installed (`npm install`)
4. ✅ Rebuild the project (`npm run build`)
5. ✅ Check file permissions
6. ✅ Verify TypeScript configuration
7. ✅ Test with curl or Postman
8. ✅ Check network connectivity
9. ✅ Review recent changes
10. ✅ Check issue tracker on GitHub

### Getting Help

1. **Check Documentation**: Review README and API docs
2. **Search Issues**: Look at GitHub issues for similar problems
3. **Create Issue**: If problem persists, create a detailed issue
4. **Include Context**: Provide error messages, environment info, and steps to reproduce

---

This development guide should help you get started with contributing to the Darch Backend project. For more specific questions, please refer to the API documentation or create an issue on GitHub.
