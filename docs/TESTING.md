# Testing Guide

This document describes the testing approach and available test scripts for the Darch Backend.

## 🧪 Testing Overview

The Darch Backend includes comprehensive testing capabilities:

- **Manual API Testing**: Direct HTTP requests to test endpoints
- **Automated Test Scripts**: Shell scripts for comprehensive testing
- **Docker Testing**: Containerized testing environment
- **Terraform Validation**: Syntax and format validation
- **Integration Testing**: End-to-end workflow validation

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

### 2. Terraform Syntax Validation
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

*For more detailed testing information, see the individual test script files and their inline documentation.*
