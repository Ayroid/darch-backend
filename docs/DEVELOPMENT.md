# Development Guide

This guide provides comprehensive information for developers working on the Darch Backend project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Organization](#code-organization)
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
npm run cli          # Run CLI mode

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
├── models/          # 🎯 Data structures & interfaces
├── views/           # 📋 Response formatting
├── controllers/     # 🎮 Request handlers  
├── services/        # ⚙️  Business logic
├── routes/          # 🛣️  API endpoints
├── middleware/      # 🔄 Express middleware
├── utils/           # 🔧 Helper functions
├── data/            # 📁 Templates & files
└── App.ts           # 🚀 Main application
```

### Adding New Components

#### 1. Adding a New Model

Create `src/models/YourModel.ts`:
```typescript
export interface YourModel {
  id: string;
  name: string;
  createdAt: string;
}

export interface YourModelResponse {
  model: YourModel;
  metadata: {
    version: string;
  };
}
```

Update `src/exports.ts`:
```typescript
export * from './models/YourModel.js';
```

#### 2. Adding a New Service

Create `src/services/YourService.ts`:
```typescript
import { YourModel } from '../models/YourModel.js';

export class YourService {
  /**
   * Process your model data
   */
  static async processData(data: YourModel): Promise<YourModel> {
    // Implement business logic
    console.log('🔄 Processing data:', data.name);
    
    // Return processed data
    return {
      ...data,
      createdAt: new Date().toISOString()
    };
  }
  
  /**
   * Validate your model
   */
  static validateModel(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.name) {
      errors.push('name is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

#### 3. Adding a New Controller

Create `src/controllers/YourController.ts`:
```typescript
import { Request, Response } from 'express';
import { YourService } from '../services/YourService.js';
import { ResponseView } from '../views/ResponseView.js';

export class YourController {
  /**
   * Handle your endpoint
   */
  static async handleYourEndpoint(req: Request, res: Response): Promise<void> {
    try {
      const { data } = req.body;
      
      // Validate input
      const validation = YourService.validateModel(data);
      if (!validation.isValid) {
        const errorResponse = ResponseView.error(
          'Invalid data',
          validation.errors.join(', ')
        );
        res.status(400).json(errorResponse);
        return;
      }
      
      // Process data
      const result = await YourService.processData(data);
      
      // Return response
      const response = ResponseView.success(result, 'Data processed successfully');
      res.json(response);
      
    } catch (error) {
      console.error('❌ Error in YourController:', error);
      const errorResponse = ResponseView.error('Internal server error');
      res.status(500).json(errorResponse);
    }
  }
}
```

#### 4. Adding Routes

Create `src/routes/yourRoutes.ts`:
```typescript
import { Router } from 'express';
import { YourController } from '../controllers/YourController.js';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware.js';

const router = Router();

router.post('/your-endpoint', 
  // Add validation middleware if needed
  YourController.handleYourEndpoint
);

export default router;
```

Update `src/routes/index.ts`:
```typescript
import yourRoutes from './yourRoutes.js';

// Add to main router
router.use('/your-prefix', yourRoutes);
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

# Generate from raw config
curl -X POST http://localhost:5000/api/generate-terraform-raw \
  -H "Content-Type: application/json" \
  -d '{"provider":{"aws":{"region":"us-east-1"}},"resource":{"aws_instance":{"test":{"ami":"ami-12345","instance_type":"t3.micro"}}}}'

# List files
curl http://localhost:5000/api/terraform-files

# Get file content
curl http://localhost:5000/api/terraform-files/your-file-name.tf
```

#### 2. Testing with Postman

Create a Postman collection with the following requests:

1. **Health Check**
   - Method: GET
   - URL: `{{baseUrl}}/health`

2. **Generate Terraform**
   - Method: POST
   - URL: `{{baseUrl}}/api/generate-terraform-raw`
   - Body: Raw JSON with terraform config

3. **List Files**
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

1. **Update Resource Mapping**
   ```typescript
   // In TerraformConfigService.ts
   private static mapResourceTypeToTerraform(resourceType: string): string {
     const mapping: Record<string, string> = {
       // Existing AWS mappings...
       
       // Add Azure mappings
       'azure-vm': 'azurerm_virtual_machine',
       'azure-vnet': 'azurerm_virtual_network',
       // ...
     };
   }
   ```

2. **Add Provider Configuration**
   ```typescript
   // In TerraformConfigService.ts
   const provider = architectureData.metadata.provider || 'aws';
   
   if (provider === 'azure') {
     config.provider.azurerm = {
       features: {}
     };
   }
   ```

3. **Update Validation**
   ```typescript
   // In ValidationUtils.ts
   const validProviders = ['aws', 'azure', 'gcp'];
   if (!validProviders.includes(data.metadata.provider)) {
     errors.push('Invalid provider');
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
