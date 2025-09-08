# Contributing to Darch Backend

We love your input! We want to make contributing to Darch Backend - a modular Terraform generation platform with enterprise-grade architecture parsing capabilities - as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Adding new modules to the registry
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### We Use [GitHub Flow](https://guides.github.com/introduction/flow/index.html)

Pull requests are the best way to propose changes to the codebase:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. If you've added new modules, include proper metadata and tests.
5. Ensure the test suite passes.
6. Make sure your code lints.
7. Issue that pull request!

## Getting Started

### Prerequisites

- Node.js 18.0.0+
- npm 9.0.0+
- Git
- TypeScript knowledge

### Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Darch-Backend.git
   cd Darch-Backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Verify module registry:**
   ```bash
   # Check module loading
   curl http://localhost:5000/api/modules

   # Test architecture validation
   curl -X POST http://localhost:5000/api/validate-architecture \
     -H "Content-Type: application/json" \
     -d @examples/sample-architecture.json
   ```

## Contributing to the Module Registry

### Adding New Modules

The Darch Backend includes a comprehensive module registry. To contribute new modules:

#### 1. Module Structure

Create a new module in the appropriate category:

```bash
# Choose the appropriate category
mkdir -p src/modules/registry/compute/my-new-service

# Create module metadata
cat > src/modules/registry/compute/my-new-service/metadata.json << 'EOF'
{
  "name": "my-new-service",
  "category": "compute",
  "version": "1.0.0",
  "description": "Description of the new service module",
  "author": "Your Name",
  "tags": ["compute", "aws", "my-service"],
  "terraform_provider": "aws",
  "terraform_resource": "aws_my_service",
  "variables": [
    {
      "name": "service_name",
      "type": "string",
      "description": "Name of the service",
      "required": true,
      "validation": {
        "pattern": "^[a-zA-Z0-9-]+$",
        "minLength": 1,
        "maxLength": 64
      }
    }
  ],
  "outputs": [
    {
      "name": "service_id",
      "description": "ID of the created service"
    }
  ],
  "dependencies": [],
  "cost_estimate": {
    "monthly_base": 0,
    "description": "Cost depends on usage"
  }
}
EOF
```

#### 2. Terraform Template

Create the Terraform template:

```bash
cat > src/modules/registry/compute/my-new-service/main.tf << 'EOF'
resource "aws_my_service" "{{sanitized_name}}" {
  name = var.service_name

  {{#each additional_config}}
  {{@key}} = {{this}}
  {{/each}}

  tags = merge(var.tags, {
    Name = var.service_name
    Module = "my-new-service"
  })
}
EOF
```

#### 3. Module Testing

Test your new module:

```bash
# Validate module metadata
npm run validate-module -- src/modules/registry/compute/my-new-service

# Test module in generation pipeline
npm run test-module -- my-new-service

# Integration test
npm run test:modules -- --module my-new-service
```

#### 4. Module Categories

Choose the appropriate category for your module:

- **networking**: VPC, subnets, load balancers, gateways
- **compute**: EC2, containers, serverless, auto-scaling
- **security**: IAM, security groups, certificates, encryption
- **storage**: S3, databases, file systems, backup
- **monitoring**: CloudWatch, logging, alerting, metrics
- **analytics**: Data processing, ETL, machine learning

## Code Style

### TypeScript Guidelines

- Use TypeScript strict mode
- Prefer interfaces over types when possible
- Use explicit return types for functions
- Use meaningful variable and function names

#### Good Examples

```typescript
// ✅ Good - Explicit types and clear naming
interface UserData {
  id: string;
  name: string;
  email: string;
}

async function processUserData(userData: UserData): Promise<ProcessedUser> {
  // Implementation
}

// ✅ Good - Error handling
try {
  const result = await processData();
  return ResponseView.success(result);
} catch (error) {
  console.error('❌ Processing failed:', error);
  return ResponseView.error('Processing failed');
}
```

#### Bad Examples

```typescript
// ❌ Bad - Using 'any' type
function processData(data: any): any {
  return data;
}

// ❌ Bad - No error handling
async function riskyOperation() {
  const result = await dangerousCall();
  return result; // What if this throws?
}

// ❌ Bad - Unclear naming
function doStuff(x: any) {
  return x.map(y => y.stuff);
}
```

### Naming Conventions

- **Classes**: PascalCase (`TerraformGenerator`)
- **Interfaces**: PascalCase (`ArchitectureData`)
- **Functions/Methods**: camelCase (`generateTerraform`)
- **Variables**: camelCase (`userData`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_REGION`)
- **Files**: camelCase for TypeScript, kebab-case for configs (`TerraformService.ts`, `docker-compose.yml`)

### File Organization

```
src/
├── controllers/        # HTTP request handlers
│   └── TerraformController.ts    # Main modular controller
├── services/          # Business logic and orchestration
│   ├── ModuleRegistryService.ts      # Module discovery & validation
│   ├── ArchitectureParserService.ts  # Architecture parsing & validation
│   ├── ModularTerraformGeneratorService.ts  # Terraform generation
│   └── FileService.ts               # File operations
├── models/            # Data structures & interfaces
│   ├── Architecture.ts    # Architecture data models
│   ├── Module.ts         # Module definitions
│   └── Terraform.ts      # Terraform output models
├── views/             # Response formatting
├── routes/            # API endpoint definitions
├── middleware/        # Express middleware
├── utils/             # Helper functions
├── templates/         # Handlebars templates
├── modules/           # Module registry
│   ├── registry/       # Module metadata & schemas
│   └── templates/      # Module Terraform templates
└── data/              # Static data and legacy templates
```

### Import Order

```typescript
// 1. Node.js built-ins
import fs from 'fs';
import path from 'path';

// 2. Third-party packages
import express from 'express';
import cors from 'cors';

// 3. Local imports (models first, then others alphabetically)
import { ArchitectureData } from '../models/Architecture.js';
import { TerraformController } from '../controllers/TerraformController.js';
import { FileService } from '../services/FileService.js';
import { ResponseView } from '../views/ResponseView.js';
```

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Examples

```bash
# Good commit messages
feat: add Azure virtual machine module to registry
fix: resolve dependency resolution in module registry
docs: update module contribution guidelines
refactor: optimize module loading performance
test: add integration tests for architecture validation
feat(modules): add RDS database module with backup configuration
fix(validation): handle circular dependencies in architecture

# Bad commit messages
update stuff
fixed bug
more changes
add module
```

## Pull Request Process

### Before Submitting

1. **Update documentation** if you've changed APIs or added features
2. **Add tests** for new functionality
3. **Run the build** to ensure everything compiles
4. **Test your changes** manually and with automated tests
5. **Update CHANGELOG.md** if applicable

### PR Title and Description

Use a clear title that describes what the PR does:

```
feat: Add Azure virtual machine module support

This PR adds Azure virtual machine module to the module registry:

- Added Azure VM module with comprehensive metadata
- Implemented size validation and region constraints
- Added dependency on resource group and virtual network
- Updated module registry to support Azure provider
- Added integration tests for Azure VM generation
- Updated documentation with Azure VM examples

The module supports:
- Multiple VM sizes with validation
- Custom disk configurations
- Network security group integration
- Backup and monitoring options

Fixes #123
Closes #124
```

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Code is commented, particularly in hard-to-understand areas
- [ ] Corresponding changes to documentation made
- [ ] Changes generate no new warnings
- [ ] Tests added that prove the fix is effective or feature works
- [ ] New and existing unit tests pass locally
- [ ] Any dependent changes have been merged and published

## Issues

### Bug Reports

When filing a bug report, please include:

1. **Clear title** describing the issue
2. **Environment details** (Node.js version, OS, etc.)
3. **Steps to reproduce** the issue
4. **Expected behavior**
5. **Actual behavior**
6. **Error messages** (with stack traces if available)
7. **Additional context** that might help

#### Bug Report Template

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Environment:**
 - OS: [e.g. Ubuntu 22.04]
 - Node.js: [e.g. 18.17.0]
 - npm: [e.g. 9.6.7]

**Additional context**
Add any other context about the problem here.
```

### Feature Requests

For feature requests, please include:

1. **Clear description** of the feature
2. **Use case** - why this would be useful
3. **Proposed solution** (if you have ideas)
4. **Alternatives considered**
5. **Additional context**

#### Feature Request Template

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## Development Guidelines

### Adding New Features

1. **Create an issue** first to discuss the feature
2. **Plan the implementation** - consider architecture impact
3. **Follow TDD** when possible (Test-Driven Development)
4. **Update documentation** as you go
5. **Consider backward compatibility**

### Code Review Guidelines

#### For Authors

- Keep PRs focused and reasonably sized
- Write clear commit messages
- Respond to feedback promptly
- Update your PR based on feedback

#### For Reviewers

- Be respectful and constructive
- Focus on the code, not the person
- Explain your suggestions
- Approve when ready, don't just nitpick

### Testing

#### Unit Tests (Recommended Setup)

```bash
# Install testing dependencies
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest

# Run tests
npm test
```

#### Test Structure

```typescript
// test/services/ModuleRegistryService.test.ts
describe('ModuleRegistryService', () => {
  describe('getAvailableModules', () => {
    it('should return all available modules', async () => {
      const modules = await ModuleRegistryService.getAvailableModules();

      expect(modules).toBeInstanceOf(Array);
      expect(modules.length).toBeGreaterThan(0);
      expect(modules[0]).toHaveProperty('name');
      expect(modules[0]).toHaveProperty('category');
    });

    it('should filter modules by category', async () => {
      const networkingModules = await ModuleRegistryService.getModulesByCategory('networking');

      expect(networkingModules.every(m => m.category === 'networking')).toBe(true);
    });
  });

  describe('validateModuleConfiguration', () => {
    it('should validate VPC module configuration', async () => {
      const config = { cidr_block: '10.0.0.0/16' };
      const result = await ModuleRegistryService.validateModuleConfig('vpc', config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid CIDR blocks', async () => {
      const config = { cidr_block: 'invalid-cidr' };
      const result = await ModuleRegistryService.validateModuleConfig('vpc', config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid CIDR block format');
    });
  });
});
```

#### API Tests

```typescript
// test/api/modules.test.ts
describe('Modules API', () => {
  it('should return available modules', async () => {
    const response = await request(app)
      .get('/api/modules')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('modules');
    expect(response.body.data.modules).toBeInstanceOf(Array);
  });

  it('should generate terraform from architecture', async () => {
    const architecture = {
      metadata: { name: 'test', provider: 'aws' },
      nodes: [
        {
          id: 'vpc-1',
          resourceType: 'vpc',
          configuration: { cidr_block: '10.0.0.0/16' }
        }
      ],
      connections: []
    };

    const response = await request(app)
      .post('/api/generate-terraform')
      .send(architecture)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.terraformCode).toContain('resource "aws_vpc"');
  });

  it('should validate architecture with dependencies', async () => {
    const architecture = {
      metadata: { name: 'test', provider: 'aws' },
      nodes: [
        {
          id: 'ec2-1',
          resourceType: 'ec2',
          configuration: { instance_type: 't3.micro' }
          // Missing VPC dependency
        }
      ],
      connections: []
    };

    const response = await request(app)
      .post('/api/validate-architecture')
      .send(architecture)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('dependency');
  });
});
```

#### Module Tests

```typescript
// test/modules/vpc.test.ts
describe('VPC Module', () => {
  it('should validate VPC metadata', () => {
    const metadata = require('../../src/modules/registry/networking/vpc/metadata.json');

    expect(metadata).toHaveProperty('name', 'vpc');
    expect(metadata).toHaveProperty('category', 'networking');
    expect(metadata.variables).toContainEqual(
      expect.objectContaining({
        name: 'cidr_block',
        required: true
      })
    );
  });

  it('should generate valid Terraform for VPC', async () => {
    const config = { cidr_block: '10.0.0.0/16', name: 'test-vpc' };
    const terraform = await ModularTerraformGeneratorService.generateModuleTerraform('vpc', config);

    expect(terraform).toContain('resource "aws_vpc"');
    expect(terraform).toContain('cidr_block = "10.0.0.0/16"');
    expect(terraform).toContain('enable_dns_hostnames = true');
  });
});
```

## Architecture Decisions

### Adding New Cloud Providers

When adding support for a new cloud provider:

1. **Create provider module structure**
   ```bash
   mkdir -p src/modules/registry/providers/azure
   ```

2. **Add provider metadata**
   ```json
   {
     "name": "azure",
     "terraform_provider": "azurerm",
     "required_version": ">= 3.0",
     "regions": ["eastus", "westus2", "westeurope"],
     "authentication": ["azure_cli", "service_principal"]
   }
   ```

3. **Extend resource mapping** in `ModuleRegistryService`
4. **Add provider-specific modules** to appropriate categories
5. **Update validation** to accept new provider
6. **Add comprehensive tests** for the new provider
7. **Update documentation** with provider examples

### Adding New Module Categories

When adding a new module category:

1. **Create category structure**
   ```bash
   mkdir -p src/modules/registry/new-category
   ```

2. **Add category metadata**
   ```json
   {
     "name": "new-category",
     "description": "Description of the new category",
     "icon": "📦",
     "modules": [],
     "dependencies": ["networking"]
   }
   ```

3. **Update registry service** to include new category
4. **Add category-specific validation** rules
5. **Create initial modules** for the category
6. **Update documentation** and examples

### Modifying Core Architecture Parser

The `ArchitectureParserService` handles architecture validation and parsing. When modifying:

1. **Ensure backward compatibility** with existing architectures
2. **Add comprehensive validation** for new features
3. **Update dependency resolution** if needed
4. **Add performance optimizations** where possible
5. **Test with complex architectures** containing many resources
6. **Update validation error messages** to be helpful

### API Changes

For API changes:

1. **Follow semantic versioning**
2. **Maintain backward compatibility** when possible
3. **Update API documentation**
4. **Add migration guides** for breaking changes
5. **Notify maintainers** of breaking changes

## Documentation

### Code Documentation

Use JSDoc comments for public APIs:

```typescript
/**
 * Convert architecture data to Terraform configuration
 *
 * @param architectureData - The frontend architecture representation
 * @returns Terraform-compatible configuration object
 *
 * @example
 * ```typescript
 * const config = TerraformConfigService.convertArchitectureDataToTerraformConfig(
 *   architectureData
 * );
 * ```
 */
static convertArchitectureDataToTerraformConfig(
  architectureData: ArchitectureData
): any {
  // Implementation
}
```

### README Updates

When adding features, update the relevant documentation:

- `README.md` - Main project overview
- `docs/API.md` - API documentation
- `docs/ARCHITECTURE.md` - Architecture details
- `docs/DEVELOPMENT.md` - Development guide

## Security

### Reporting Security Issues

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, email the maintainers directly with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if you have one)

### Security Guidelines

- Never commit secrets or credentials
- Validate all inputs
- Use parameterized queries if using databases
- Keep dependencies updated
- Follow OWASP guidelines

## Performance

### Performance Considerations

- Use async/await for I/O operations
- Avoid blocking the event loop
- Consider memory usage for large configurations
- Profile performance-critical code
- Use appropriate data structures

### Benchmarking

When optimizing performance:

```typescript
// Add timing to critical operations
const startTime = Date.now();
const result = await expensiveOperation();
const duration = Date.now() - startTime;
console.log(`Operation took ${duration}ms`);
```

## Community

### Getting Help

- Create an issue for bugs or feature requests
- Join discussions in existing issues
- Check documentation first
- Be respectful and patient

### Helping Others

- Answer questions in issues
- Review pull requests
- Improve documentation
- Share your use cases

## Recognition

Contributors will be recognized in:

- `CONTRIBUTORS.md` file
- Release notes for significant contributions
- Special recognition for major features

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (ISC License).

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Enforcement

Project maintainers are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

---

Thank you for contributing to Darch Backend! 🚀
