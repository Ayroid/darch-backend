# Testing Guide

This document describes the comprehensive testing approach for the Darch Backend, including unit tests, integration tests, and manual testing procedures.

## 🧪 Testing Overview

The Darch Backend includes multiple layers of testing for enterprise-grade reliability:

- **Unit Testing**: Jest-based unit tests for services, utilities, and components
- **Integration Testing**: End-to-end workflow validation
- **Manual API Testing**: Direct HTTP requests to test endpoints
- **Automated Test Scripts**: Shell scripts for comprehensive testing
- **Docker Testing**: Containerized testing environment
- **Terraform Validation**: Syntax and format validation

## 🚀 Quick Testing

### Run All Unit Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Architecture Parser Service tests
npm test -- --testPathPatterns=architecture-parser.service.test.ts

# Terraform Generator Service tests
npm test -- --testPathPatterns=modular-terraform-generator.service.test.ts

# Validation Utils tests
npm test -- --testPathPatterns=validation-utils.test.ts

# Config Utils tests
npm test -- --testPathPatterns=config-utils.test.ts
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Watch Mode for Development

```bash
npm run test:watch
```

## 🚀 Quick Testing

### Health Check

```bash
curl http://localhost:5000/health
```

### Module Discovery

```bash
curl http://localhost:5000/api/modules
```

### Architecture Validation

```bash
curl -X POST http://localhost:5000/api/validate-architecture \
  -H "Content-Type: application/json" \
  -d @test-terraform-request.json
```

### Terraform Generation

```bash
curl -X POST http://localhost:5000/api/generate-terraform \
  -H "Content-Type: application/json" \
  -d @test-terraform-request.json
```

## 📋 Available Test Scripts

### 1. Modular Testing Script

**File**: `test-modular.sh`

Comprehensive test suite covering all API endpoints:

```bash
chmod +x test-modular.sh
./test-modular.sh
```

**Tests Include:**

- Server health check
- Module registry discovery
- Architecture validation
- Terraform generation
- Dependency validation
- Error handling scenarios

### 2. Unit Test Suites

**Framework**: Jest with TypeScript support

Our comprehensive unit test suite covers:

#### ArchitectureParserService Tests (`tests/unit/services/architecture-parser.service.test.ts`)

- ✅ **Resource Type Mapping** - Tests for new IGW and Route Table mappings
- ✅ **Architecture Parsing** - Validation, defaults, and dependency resolution
- ✅ **Validation Pipeline** - CIDR validation, security warnings, circular dependency detection
- ✅ **Edge Cases** - Empty data, malformed nodes, invalid connections
- ✅ **Error Handling** - Graceful handling of unsupported resources

```bash
# Run specific test suite
npx jest tests/unit/services/architecture-parser.service.test.ts --verbose
```

#### ModularTerraformGeneratorService Tests (`tests/unit/services/modular-terraform-generator.service.test.ts`)

- ✅ **Terraform Generation** - Main.tf, variables.tf, outputs.tf, tfvars generation
- ✅ **Cross-Module References** - VPC dependencies, module output references
- ✅ **Syntax Validation** - Terraform syntax checking and error detection
- ✅ **Multi-Provider Support** - AWS, Azure, GCP provider configurations
- ✅ **Complex Scenarios** - Nested modules, complex variable types

```bash
# Run Terraform generator tests
npx jest tests/unit/services/modular-terraform-generator.service.test.ts --verbose
```

#### ValidationUtils Tests (`tests/unit/utils/validation-utils.test.ts`)

- ✅ **Field Validation** - Required field checking with comprehensive edge cases
- ✅ **Architecture Validation** - Complete architecture data structure validation
- ✅ **Type Safety** - Null/undefined handling, prototype properties
- ✅ **Error Accumulation** - Multiple validation error collection and reporting

```bash
# Run validation utility tests
npx jest tests/unit/utils/validation-utils.test.ts --verbose
```

#### ConfigUtils Tests (`tests/unit/utils/config-utils.test.ts`)

- ✅ **Environment Variables** - Environment variable parsing and defaults
- ✅ **Configuration Values** - Port, NODE_ENV, CORS origin handling
- ✅ **Edge Cases** - Invalid values, special characters, type conversions
- ✅ **Integration Scenarios** - Multiple configuration combinations

```bash
# Run configuration utility tests
npx jest tests/unit/utils/config-utils.test.ts --verbose
```

### 3. Terraform Syntax Validation

**File**: `test/validate-terraform-syntax.sh`

Validates generated Terraform files:

```bash
chmod +x test/validate-terraform-syntax.sh
./test/validate-terraform-syntax.sh
```

**Validation Checks:**

- Syntax correctness
- Balanced braces and brackets
- Modern Terraform syntax (0.12+)
- Security best practices
- Resource structure validation

## 🐳 Docker Testing

### Build and Test Container

```bash
npm run docker:build
npm run docker:test
```

### Manual Docker Testing

```bash
# Build image
docker build -t darch-backend-test .

# Run tests in container
docker run --rm darch-backend-test npm test

# Interactive testing
docker run -it --rm -p 5000:5000 darch-backend-test bash
```

## 📊 Test Data

### Sample Architecture JSON

**File**: `test-terraform-request.json`

Contains a complete sample architecture with:

- VPC configuration
- Public and private subnets
- Security groups
- EC2 instances
- Proper dependency relationships

### Test Output Directory

**Directory**: `test-output/`

Generated Terraform files are saved here during testing.

## 🔍 Manual Testing Scenarios

### 1. Basic Workflow Test

```bash
# 1. Start server
npm start

# 2. Check health
curl http://localhost:5000/health

# 3. List modules
curl http://localhost:5000/api/modules

# 4. Validate architecture
curl -X POST http://localhost:5000/api/validate-architecture \
  -H "Content-Type: application/json" \
  -d @test-terraform-request.json

# 5. Generate Terraform
curl -X POST http://localhost:5000/api/generate-terraform \
  -H "Content-Type: application/json" \
  -d @test-terraform-request.json
```

### 2. Error Handling Tests

```bash
# Invalid JSON
curl -X POST http://localhost:5000/api/generate-terraform \
  -H "Content-Type: application/json" \
  -d '{"invalid": json}'

# Missing required fields
curl -X POST http://localhost:5000/api/generate-terraform \
  -H "Content-Type: application/json" \
  -d '{"architectureData": {}}'

# Invalid resource type
curl -X POST http://localhost:5000/api/generate-terraform \
  -H "Content-Type: application/json" \
  -d '{
    "architectureData": {
      "nodes": [{"resourceType": "invalid-type"}]
    }
  }'
```

### 3. Module Validation Tests

```bash
# Valid module configuration
curl -X POST http://localhost:5000/api/modules/validate \
  -H "Content-Type: application/json" \
  -d '{
    "category": "networking",
    "name": "vpc",
    "configuration": {
      "cidr_block": "10.0.0.0/16"
    }
  }'

# Invalid configuration
curl -X POST http://localhost:5000/api/modules/validate \
  -H "Content-Type: application/json" \
  -d '{
    "category": "networking",
    "name": "vpc",
    "configuration": {
      "invalid_field": "value"
    }
  }'
```

## 📈 Performance Testing

### Load Testing with curl

```bash
# Multiple concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/generate-terraform \
    -H "Content-Type: application/json" \
    -d @test-terraform-request.json &
done
wait
```

### Memory Usage Monitoring

```bash
# Monitor memory usage during testing
while true; do
  ps aux | grep node | grep -v grep
  sleep 5
done
```

## 🐛 Debugging Tests

### Enable Debug Logging

```bash
NODE_ENV=development npm start
```

### Test with Verbose Output

```bash
curl -v http://localhost:5000/health
```

### Check Generated Files

```bash
# List generated files
ls -la src/output/

# View generated Terraform
cat src/output/*/main.tf
```

## ✅ Test Validation Checklist

Before releasing, ensure all tests pass:

- [ ] Health endpoint responds correctly
- [ ] Module registry loads all modules
- [ ] Architecture validation works for valid and invalid inputs
- [ ] Terraform generation produces valid files
- [ ] Dependency validation detects circular dependencies
- [ ] Error handling returns appropriate error codes
- [ ] Generated Terraform passes syntax validation
- [ ] Docker container builds and runs successfully
- [ ] All test scripts execute without errors

## 🔧 Troubleshooting Tests

### Common Issues

**Port Already in Use**

```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

**Permission Denied on Scripts**

```bash
# Make scripts executable
chmod +x test-modular.sh
chmod +x test-clean-format.sh
chmod +x test/validate-terraform-syntax.sh
```

**Module Files Not Found**

```bash
# Check module directory structure
ls -la terraform-modules/
```

**Generated Files Not Created**

```bash
# Check output directory permissions
ls -la src/output/
mkdir -p src/output/
```

## 📝 Adding New Tests

### Adding API Endpoint Tests

1. Add test case to `test-modular.sh`
2. Include positive and negative test scenarios
3. Validate response format and status codes
4. Test error handling

### Adding Module Tests

1. Create sample module configuration
2. Test validation logic
3. Test Terraform generation
4. Verify output quality

### Adding Integration Tests

1. Create end-to-end scenarios
2. Test multiple API calls in sequence
3. Validate data flow between endpoints
4. Test realistic architecture patterns

---

_For more detailed testing information, see the individual test script files and their inline documentation._
