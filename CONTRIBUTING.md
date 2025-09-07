# Contributing to Darch Backend

We love your input! We want to make contributing to Darch Backend as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### We Use [GitHub Flow](https://guides.github.com/introduction/flow/index.html)

Pull requests are the best way to propose changes to the codebase:

1. Fork the repo and create your branch from `master`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

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
├── models/          # Interfaces and type definitions
├── views/           # Response formatting
├── controllers/     # HTTP request handlers
├── services/        # Business logic
├── routes/          # API endpoint definitions
├── middleware/      # Express middleware
├── utils/           # Helper functions
└── data/            # Static data and templates
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
feat: add support for Azure resource types
fix: resolve memory leak in terraform generation
docs: update API documentation for new endpoints
refactor: extract validation logic to separate service
test: add unit tests for TerraformConfigService

# Bad commit messages
update stuff
fixed bug
more changes
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
feat: Add Azure resource type support

This PR adds support for Azure resource types in the Terraform generator:

- Added Azure resource type mappings
- Updated validation to accept Azure resources  
- Added Azure provider configuration
- Updated documentation with Azure examples

Fixes #123
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
// test/services/TerraformConfigService.test.ts
describe('TerraformConfigService', () => {
  describe('convertArchitectureDataToTerraformConfig', () => {
    it('should convert basic EC2 configuration', () => {
      const input = createMockArchitectureData();
      const result = TerraformConfigService.convertArchitectureDataToTerraformConfig(input);
      
      expect(result).toHaveProperty('provider.aws');
      expect(result.resources.aws_instance).toBeDefined();
    });
    
    it('should handle missing configuration gracefully', () => {
      const input = createInvalidArchitectureData();
      
      expect(() => {
        TerraformConfigService.convertArchitectureDataToTerraformConfig(input);
      }).not.toThrow();
    });
  });
});
```

#### API Tests

```typescript
// test/api/terraform.test.ts
describe('Terraform API', () => {
  it('should generate terraform from raw config', async () => {
    const config = {
      provider: { aws: { region: 'us-east-1' } },
      resource: { aws_instance: { test: { ami: 'ami-12345' } } }
    };

    const response = await request(app)
      .post('/api/generate-terraform-raw')
      .send(config)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.terraformCode).toContain('provider "aws"');
  });
});
```

## Architecture Decisions

### Adding New Cloud Providers

When adding support for a new cloud provider:

1. **Extend resource mapping** in `TerraformConfigService`
2. **Add provider configuration** logic
3. **Update validation** to accept new provider
4. **Add templates** if needed
5. **Update documentation**
6. **Add tests** for the new provider

### Modifying Core Generator

The `TerraformGenerator` is the core of the application. When modifying:

1. **Ensure backward compatibility**
2. **Add comprehensive tests**
3. **Update documentation**
4. **Consider performance impact**
5. **Test with various configurations**

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
