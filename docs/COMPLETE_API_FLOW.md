# Complete API Flow Documentation

**Generated on:** 17 December 2025
**Repository:** Darch-Backend
**Branch:** feature/frontend-connectivity
**Version:** 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Health Check API](#health-check-api)
4. [Terraform Generation APIs](#terraform-generation-apis)
5. [Terraform Execution APIs](#terraform-execution-apis)
6. [Validation APIs](#validation-apis)
7. [Module Management APIs](#module-management-apis)
8. [File Management APIs](#file-management-apis)
9. [Project Management APIs](#project-management-apis)
10. [Data Models](#data-models)
11. [Error Handling](#error-handling)
12. [Authentication & Security](#authentication--security)

---

## Overview

The Darch Backend API provides a comprehensive set of endpoints for managing Terraform infrastructure-as-code generation, validation, execution, and file management. The system supports both synchronous operations (immediate responses) and asynchronous operations (job-based processing with status polling).

### Base URL
```
http://localhost:<PORT>
```

### API Prefix
```
/api
```

### Response Format
All API responses follow a standard JSON format:
```typescript
{
  "success": boolean,
  "data": any,
  "message": string,
  "error"?: string,
  "details"?: string,
  "timestamp": string
}
```

---

## System Architecture

### Request Flow

```
Client Request
    ↓
Express Router (routes/index.ts)
    ↓
Route Handlers (apiRoutes.ts / healthRoutes.ts)
    ↓
Validation Middleware (optional)
    ↓
Controller Methods
    ↓
Service Layer
    ↓
Response View (standardized response)
    ↓
Client Response
```

### Service Layer Components

1. **ArchitectureParserService**: Parses and validates architecture data
2. **FrontendArchitectureTransformerService**: Transforms frontend format to backend format
3. **ModuleMapperService**: Maps architecture nodes to Terraform modules
4. **ModularTerraformGeneratorService**: Generates Terraform configuration files
5. **ModuleRegistryService**: Manages available Terraform modules
6. **FileService**: Handles file operations (read, write, download)
7. **TerraformExecutionService**: Executes Terraform CLI commands (async jobs)

---

## Health Check API

### GET /health

**Purpose**: Check API server health and availability

**Authentication**: None

**Request**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-12-17T10:30:00.000Z"
  },
  "message": "Server is healthy"
}
```

**Flow Diagram**:
```
GET /health
    ↓
HealthController.healthCheck()
    ↓
ResponseView.healthCheck()
    ↓
Return 200 OK
```

**Error Cases**:
- 500: Server error (extremely rare)

---

## Terraform Generation APIs

### POST /api/terraform/generate

**Purpose**: Generate complete Terraform configuration files from architecture data (synchronous, creates actual files on disk)

**Authentication**: None (add JWT validation if needed)

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "architectureData": {
    "metadata": {
      "name": "my-infrastructure",
      "description": "Sample infrastructure",
      "version": "1.0.0",
      "createdAt": "2025-12-17T10:00:00.000Z",
      "lastModified": "2025-12-17T10:00:00.000Z",
      "provider": "aws"
    },
    "nodes": [
      {
        "id": "node-1",
        "nodeType": "awsService",
        "resourceType": "aws-vpc",
        "name": "main-vpc",
        "configuration": {
          "cidr_block": "10.0.0.0/16",
          "enable_dns_hostnames": true,
          "enable_dns_support": true
        }
      }
    ],
    "connections": [],
    "variables": {},
    "outputs": {}
  },
  "projectName": "my-project"
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "data": {
    "projectName": "my-project",
    "outputPath": "/path/to/output/users/sudo/my-project",
    "files": [
      {
        "name": "main.tf",
        "path": "/path/to/output/users/sudo/my-project/main.tf",
        "size": 1024
      },
      {
        "name": "variables.tf",
        "path": "/path/to/output/users/sudo/my-project/variables.tf",
        "size": 512
      }
    ],
    "generationDetails": {
      "modulesUsed": ["vpc", "subnet", "ec2"],
      "resourcesGenerated": 5,
      "totalLines": 250
    },
    "costEstimate": {
      "monthlyEstimate": 150,
      "breakdown": {
        "vpc": 0,
        "ec2": 120,
        "s3": 30
      },
      "currency": "USD",
      "disclaimer": "This is a rough estimate..."
    }
  },
  "message": "Terraform configuration generated successfully",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
POST /api/terraform/generate
    ↓
ValidationMiddleware.validateArchitectureData()
    │   └─ ValidationUtils.validateArchitectureData()
    │       └─ Checks: metadata, nodes[], connections[]
    ↓
TerraformController.generateModularTerraform()
    │
    ├─ 1. Format Detection
    │   └─ TerraformController.isFrontendFormat()
    │       └─ Check if frontend format (nodeType, resourceType pattern)
    │
    ├─ 2a. Frontend Format Processing (if detected)
    │   ├─ FrontendArchitectureTransformerService.validateFrontendData()
    │   └─ FrontendArchitectureTransformerService.transformToBackendFormat()
    │       └─ Transform nodes, map resource types, create connections
    │
    ├─ 2b. Backend Format Processing (if not frontend)
    │   └─ Use architectureData as-is
    │
    ├─ 3. Architecture Parsing
    │   └─ ArchitectureParserService.parseArchitecture()
    │       ├─ Validate structure
    │       ├─ Process nodes
    │       ├─ Process connections
    │       └─ Extract metadata
    │
    ├─ 4. Module Mapping
    │   └─ ModuleMapperService.mapArchitectureToModules()
    │       ├─ Load module registry
    │       ├─ Match nodes to modules
    │       ├─ Validate configurations
    │       └─ Build dependency graph
    │
    ├─ 5. Terraform Generation
    │   └─ ModularTerraformGeneratorService.generateModularTerraform()
    │       ├─ Generate provider.tf
    │       ├─ Generate variables.tf
    │       ├─ Generate main.tf (module calls)
    │       ├─ Generate outputs.tf
    │       └─ Generate terraform.tfvars
    │
    ├─ 6. File Writing
    │   └─ FileService.saveTerraformFiles()
    │       ├─ Create project directory
    │       ├─ Write all .tf files
    │       └─ Set permissions
    │
    ├─ 7. Cost Estimation
    │   └─ TerraformController.estimateCost()
    │       └─ Calculate based on resource types
    │
    └─ 8. Response Generation
        └─ ResponseView.success()
```

**Error Cases**:
- 400: Missing or invalid architecture data
- 400: Frontend format validation failed
- 400: Frontend transformation failed
- 400: Architecture parsing failed
- 500: Module mapping error
- 500: Terraform generation error
- 500: File writing error

---

## Terraform Execution APIs

### POST /api/terraform/plan

**Purpose**: Generate Terraform plan with actual `terraform init` and `terraform plan` execution (asynchronous job)

**Authentication**: None

**Request Body**: Same as `/api/terraform/generate`

**Response** (Success - 202 Accepted):
```json
{
  "success": true,
  "data": {
    "jobId": "plan-1234567890",
    "status": "queued",
    "message": "Terraform plan job created",
    "pollUrl": "/api/terraform/plan-status/plan-1234567890"
  },
  "message": "Terraform plan job started",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
POST /api/terraform/plan
    ↓
ValidationMiddleware.validateArchitectureData()
    ↓
TerraformController.generateTerraformPlan()
    │
    ├─ 1. Format Detection & Transformation (same as /generate)
    │
    ├─ 2. Architecture Parsing
    │   └─ ArchitectureParserService.parseArchitecture()
    │
    ├─ 3. Module Mapping
    │   └─ ModuleMapperService.mapArchitectureToModules()
    │
    ├─ 4. Terraform Generation
    │   └─ ModularTerraformGeneratorService.generateModularTerraform()
    │
    ├─ 5. File Writing
    │   └─ FileService.saveTerraformFiles()
    │
    ├─ 6. Create Async Job
    │   └─ TerraformExecutionService.createPlanJob()
    │       ├─ Generate unique jobId
    │       ├─ Set status: "queued"
    │       ├─ Store job metadata
    │       └─ Start background execution
    │
    └─ 7. Return Job ID (202 Accepted)
        └─ ResponseView.success({ jobId, pollUrl })
```

**Background Job Execution**:
```
TerraformExecutionService.executePlanJob()
    │
    ├─ Update status: "running"
    │
    ├─ Execute: terraform init
    │   ├─ Capture stdout/stderr
    │   └─ Log output
    │
    ├─ Execute: terraform plan -out=tfplan
    │   ├─ Capture stdout/stderr
    │   ├─ Parse plan output
    │   └─ Log output
    │
    ├─ Parse Results
    │   ├─ Extract resource changes
    │   ├─ Extract warnings/errors
    │   └─ Build result object
    │
    └─ Update status: "completed" or "failed"
        └─ Store result/error
```

**Error Cases**:
- 400: Invalid architecture data
- 500: Job creation failed
- Background job errors stored in job status

---

### GET /api/terraform/plan-status/:jobId

**Purpose**: Poll the status of an async Terraform plan job

**Authentication**: None

**Request Parameters**:
- `jobId` (path parameter): The job ID returned from `/terraform/plan`

**Response** (Running):
```json
{
  "success": true,
  "data": {
    "jobId": "plan-1234567890",
    "status": "running",
    "progress": 50,
    "message": "Executing terraform plan...",
    "createdAt": "2025-12-17T10:30:00.000Z",
    "updatedAt": "2025-12-17T10:30:30.000Z",
    "logs": [
      "Initializing Terraform...",
      "Terraform initialized successfully!",
      "Generating plan..."
    ]
  },
  "message": "Job running",
  "timestamp": "2025-12-17T10:30:35.000Z"
}
```

**Response** (Completed):
```json
{
  "success": true,
  "data": {
    "jobId": "plan-1234567890",
    "status": "completed",
    "progress": 100,
    "message": "Terraform plan completed successfully",
    "result": {
      "summary": {
        "add": 5,
        "change": 0,
        "destroy": 0
      },
      "changes": [
        {
          "action": "create",
          "resource": "aws_vpc.main",
          "details": "..."
        }
      ]
    },
    "createdAt": "2025-12-17T10:30:00.000Z",
    "updatedAt": "2025-12-17T10:31:00.000Z",
    "logs": [
      "Initializing Terraform...",
      "Terraform initialized successfully!",
      "Plan: 5 to add, 0 to change, 0 to destroy."
    ],
    "rawOutput": "full terraform output..."
  },
  "message": "Job completed",
  "timestamp": "2025-12-17T10:31:05.000Z"
}
```

**Response** (Failed):
```json
{
  "success": true,
  "data": {
    "jobId": "plan-1234567890",
    "status": "failed",
    "progress": 60,
    "message": "Terraform plan failed",
    "error": "Error: Invalid configuration...",
    "createdAt": "2025-12-17T10:30:00.000Z",
    "updatedAt": "2025-12-17T10:30:45.000Z",
    "logs": [
      "Initializing Terraform...",
      "Error: Invalid configuration..."
    ]
  },
  "message": "Job failed",
  "timestamp": "2025-12-17T10:30:50.000Z"
}
```

**Flow**:
```
GET /api/terraform/plan-status/:jobId
    ↓
TerraformController.getTerraformPlanStatus()
    ↓
TerraformExecutionService.getJobStatus(jobId)
    │   └─ Retrieve job from in-memory store
    ↓
ResponseView.success(jobStatus)
```

**Job Status Values**:
- `queued`: Job created, waiting to start
- `running`: Job is executing
- `completed`: Job finished successfully
- `failed`: Job encountered an error

**Error Cases**:
- 400: Missing jobId
- 404: Job not found
- 500: Internal server error

---

### GET /api/terraform/plan-jobs

**Purpose**: Get list of all Terraform plan jobs

**Authentication**: None

**Request**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "jobId": "plan-1234567890",
        "projectName": "my-project",
        "status": "completed",
        "createdAt": "2025-12-17T10:30:00.000Z",
        "updatedAt": "2025-12-17T10:31:00.000Z",
        "message": "Terraform plan completed successfully"
      },
      {
        "jobId": "plan-0987654321",
        "projectName": "another-project",
        "status": "running",
        "createdAt": "2025-12-17T10:35:00.000Z",
        "updatedAt": "2025-12-17T10:35:30.000Z",
        "message": "Executing terraform plan..."
      }
    ],
    "totalJobs": 2
  },
  "message": "Retrieved all terraform plan jobs",
  "timestamp": "2025-12-17T10:36:00.000Z"
}
```

**Flow**:
```
GET /api/terraform/plan-jobs
    ↓
TerraformController.getAllTerraformPlanJobs()
    ↓
TerraformExecutionService.getAllJobs()
    ↓
ResponseView.success(jobs)
```

---

### DELETE /api/terraform/plan-jobs/:jobId

**Purpose**: Delete a completed Terraform plan job

**Authentication**: None

**Request Parameters**:
- `jobId` (path parameter): The job ID to delete

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "plan-1234567890",
    "deleted": true
  },
  "message": "Job deleted successfully",
  "timestamp": "2025-12-17T10:40:00.000Z"
}
```

**Flow**:
```
DELETE /api/terraform/plan-jobs/:jobId
    ↓
TerraformController.deleteTerraformPlanJob()
    ↓
TerraformExecutionService.deleteJob(jobId)
    ↓
ResponseView.success({ deleted: true })
```

**Error Cases**:
- 400: Missing jobId
- 404: Job not found or couldn't be deleted
- 500: Internal server error

---

### POST /api/terraform/apply

**Purpose**: Apply Terraform infrastructure with actual `terraform apply` execution (asynchronous job)

**Authentication**: None

**Request Body**: Same as `/api/terraform/generate`

**Response** (Success - 202 Accepted):
```json
{
  "success": true,
  "data": {
    "jobId": "apply-1234567890",
    "status": "queued",
    "message": "Terraform apply job created",
    "pollUrl": "/api/terraform/apply-status/apply-1234567890"
  },
  "message": "Terraform apply job started",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
POST /api/terraform/apply
    ↓
ValidationMiddleware.validateArchitectureData()
    ↓
TerraformController.generateTerraformApply()
    │
    ├─ 1-5. Same as /terraform/plan
    │   (Format detection, parsing, mapping, generation, file writing)
    │
    ├─ 6. Create Async Apply Job
    │   └─ TerraformExecutionService.createApplyJob()
    │       ├─ Generate unique jobId (apply-*)
    │       ├─ Set status: "queued"
    │       └─ Start background execution
    │
    └─ 7. Return Job ID (202 Accepted)
```

**Background Job Execution**:
```
TerraformExecutionService.executeApplyJob()
    │
    ├─ Update status: "running"
    │
    ├─ Execute: terraform init
    │
    ├─ Execute: terraform apply -auto-approve
    │   ├─ Capture stdout/stderr
    │   ├─ Parse apply output
    │   └─ Log output
    │
    ├─ Parse Results
    │   ├─ Extract applied resources
    │   ├─ Extract outputs
    │   └─ Build result object
    │
    └─ Update status: "completed" or "failed"
```

**Error Cases**:
- 400: Invalid architecture data
- 500: Job creation failed

---

### GET /api/terraform/apply-status/:jobId

**Purpose**: Poll the status of an async Terraform apply job

**Authentication**: None

**Request Parameters**:
- `jobId` (path parameter): The job ID returned from `/terraform/apply`

**Response**: Same structure as `/terraform/plan-status/:jobId`

**Flow**:
```
GET /api/terraform/apply-status/:jobId
    ↓
TerraformController.getTerraformApplyStatus()
    ↓
TerraformExecutionService.getJobStatus(jobId)
    ↓
ResponseView.success(jobStatus)
```

---

### POST /api/terraform/destroy

**Purpose**: Destroy Terraform infrastructure with actual `terraform destroy` execution (asynchronous job)

**Authentication**: None

**Request Body**:
```json
{
  "projectName": "my-project",
  "userId": "sudo"
}
```

**Response** (Success - 202 Accepted):
```json
{
  "success": true,
  "data": {
    "jobId": "destroy-1234567890",
    "status": "queued",
    "message": "Terraform destroy job created",
    "pollUrl": "/api/terraform/destroy-status/destroy-1234567890"
  },
  "message": "Terraform destroy job started",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
POST /api/terraform/destroy
    ↓
TerraformController.generateTerraformDestroy()
    │
    ├─ 1. Validate Request
    │   └─ Check projectName exists
    │
    ├─ 2. Create Async Destroy Job
    │   └─ TerraformExecutionService.createDestroyJob()
    │       ├─ Generate unique jobId (destroy-*)
    │       ├─ Set status: "queued"
    │       └─ Start background execution
    │
    └─ 3. Return Job ID (202 Accepted)
```

**Background Job Execution**:
```
TerraformExecutionService.executeDestroyJob()
    │
    ├─ Update status: "running"
    │
    ├─ Execute: terraform destroy -auto-approve
    │   ├─ Capture stdout/stderr
    │   ├─ Parse destroy output
    │   └─ Log output
    │
    ├─ Parse Results
    │   ├─ Extract destroyed resources
    │   └─ Build result object
    │
    └─ Update status: "completed" or "failed"
```

**Error Cases**:
- 400: Missing projectName
- 404: Project not found
- 500: Job creation failed

---

### GET /api/terraform/destroy-status/:jobId

**Purpose**: Poll the status of an async Terraform destroy job

**Authentication**: None

**Request Parameters**:
- `jobId` (path parameter): The job ID returned from `/terraform/destroy`

**Response**: Same structure as `/terraform/plan-status/:jobId`

**Flow**:
```
GET /api/terraform/destroy-status/:jobId
    ↓
TerraformController.getTerraformDestroyStatus()
    ↓
TerraformExecutionService.getJobStatus(jobId)
    ↓
ResponseView.success(jobStatus)
```

---

## Validation APIs

### POST /api/validate/architecture

**Purpose**: Validate architecture design before generation (synchronous)

**Authentication**: None

**Request Body**:
```json
{
  "architectureData": {
    "metadata": { ... },
    "nodes": [ ... ],
    "connections": [ ... ]
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "validation": {
      "valid": true,
      "errors": [],
      "warnings": []
    },
    "nodes": 5,
    "connections": 3,
    "metadata": {
      "name": "my-infrastructure",
      "provider": "aws",
      "version": "1.0.0"
    }
  },
  "message": "Architecture validation completed",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
POST /api/validate/architecture
    ↓
ValidationMiddleware.validateArchitectureData()
    ↓
TerraformController.validateArchitecture()
    │
    ├─ Parse Architecture
    │   └─ ArchitectureParserService.parseArchitecture()
    │       ├─ Validate metadata
    │       ├─ Validate nodes structure
    │       ├─ Validate connections
    │       ├─ Check for circular dependencies
    │       └─ Return validation result
    │
    └─ Return Validation Summary
        └─ ResponseView.success({
              validation,
              nodes: count,
              connections: count,
              metadata
           })
```

**Validation Checks**:
1. **Metadata validation**:
   - Required fields: name, version, provider
   - Valid provider values

2. **Nodes validation**:
   - Required fields: id, nodeType, resourceType, name, configuration
   - Valid nodeType values
   - No duplicate IDs

3. **Connections validation**:
   - Valid source and target node IDs
   - No circular dependencies
   - Valid connection types

4. **Configuration validation**:
   - Required configuration fields per resource type
   - Valid configuration values

**Error Cases**:
- 400: Missing architecture data
- 400: Invalid architecture structure
- 500: Validation processing error

---

### POST /api/validate/dependencies

**Purpose**: Validate resource dependencies in architecture

**Authentication**: None

**Request Body**: Same as `/api/validate/architecture`

**Response**:
```json
{
  "success": true,
  "data": {
    "validation": {
      "valid": true,
      "errors": [],
      "warnings": []
    },
    "dependencyGraph": {
      "nodes": [
        {
          "id": "node-1",
          "name": "main-vpc",
          "type": "aws-vpc",
          "dependencies": []
        },
        {
          "id": "node-2",
          "name": "public-subnet",
          "type": "aws-subnet",
          "dependencies": ["node-1"]
        }
      ],
      "edges": [
        {
          "from": "node-2",
          "to": "node-1",
          "type": "depends_on"
        }
      ]
    },
    "moduleMapping": [
      {
        "nodeId": "node-1",
        "moduleName": "vpc",
        "category": "networking",
        "dependencies": []
      },
      {
        "nodeId": "node-2",
        "moduleName": "subnet",
        "category": "networking",
        "dependencies": ["vpc"]
      }
    ]
  },
  "message": "Dependency validation completed",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
POST /api/validate/dependencies
    ↓
ValidationMiddleware.validateArchitectureData()
    ↓
TerraformController.validateDependencies()
    │
    ├─ 1. Parse Architecture
    │   └─ ArchitectureParserService.parseArchitecture()
    │
    ├─ 2. Map to Modules
    │   └─ ModuleMapperService.mapArchitectureToModules()
    │       ├─ Match nodes to modules
    │       ├─ Validate module configurations
    │       └─ Build dependency relationships
    │
    ├─ 3. Build Dependency Graph
    │   └─ TerraformController.buildDependencyVisualization()
    │       ├─ Create nodes
    │       ├─ Create edges
    │       └─ Detect circular dependencies
    │
    └─ 4. Return Dependency Analysis
        └─ ResponseView.success({
              validation,
              dependencyGraph,
              moduleMapping
           })
```

**Dependency Validation Checks**:
1. No circular dependencies
2. All dependencies reference valid nodes
3. Dependencies match resource types (e.g., subnet depends on VPC)
4. Required dependencies are present

**Error Cases**:
- 400: Missing architecture data
- 400: Invalid dependency configuration
- 500: Dependency analysis error

---

## Module Management APIs

### GET /api/modules

**Purpose**: Get list of all available Terraform modules

**Authentication**: None

**Request**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "modules": [
      {
        "name": "vpc",
        "category": "networking",
        "description": "AWS VPC module",
        "version": "1.0.0",
        "provider": "aws",
        "variables": [
          {
            "name": "cidr_block",
            "type": "string",
            "required": true,
            "description": "CIDR block for VPC"
          }
        ]
      },
      {
        "name": "ec2",
        "category": "compute",
        "description": "AWS EC2 instance module",
        "version": "1.0.0",
        "provider": "aws",
        "variables": [ ... ]
      }
    ],
    "categories": ["networking", "compute", "storage", "security"],
    "totalModules": 15
  },
  "message": "Modules retrieved successfully",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
GET /api/modules
    ↓
TerraformController.getAvailableModules()
    │
    ├─ Fetch All Modules
    │   └─ ModuleRegistryService.getAvailableModules()
    │       ├─ Read module definitions from disk
    │       ├─ Parse module metadata
    │       └─ Return module list
    │
    ├─ Extract Categories
    │   └─ Extract unique categories from modules
    │
    └─ Return Module List
        └─ ResponseView.success({
              modules,
              categories,
              totalModules
           })
```

**Module Structure**:
Each module includes:
- Basic metadata (name, category, description, version)
- Provider information
- Input variables with types and descriptions
- Output values
- Dependencies on other modules

**Error Cases**:
- 500: Module registry loading error

---

### GET /api/modules/:category/:name

**Purpose**: Get detailed information about a specific module

**Authentication**: None

**Request Parameters**:
- `category` (path parameter): Module category (e.g., "networking")
- `name` (path parameter): Module name (e.g., "vpc")

**Response**:
```json
{
  "success": true,
  "data": {
    "module": {
      "name": "vpc",
      "category": "networking",
      "description": "AWS VPC module",
      "version": "1.0.0",
      "provider": "aws",
      "variables": [
        {
          "name": "cidr_block",
          "type": "string",
          "required": true,
          "default": null,
          "description": "CIDR block for VPC"
        },
        {
          "name": "enable_dns_hostnames",
          "type": "bool",
          "required": false,
          "default": true,
          "description": "Enable DNS hostnames in VPC"
        }
      ],
      "outputs": [
        {
          "name": "vpc_id",
          "description": "ID of the VPC"
        },
        {
          "name": "vpc_arn",
          "description": "ARN of the VPC"
        }
      ]
    },
    "metadata": {
      "sourceFile": "/path/to/modules/networking/vpc/main.tf",
      "lastModified": "2025-12-01T00:00:00.000Z",
      "dependencies": []
    }
  },
  "message": "Module details retrieved successfully",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
GET /api/modules/:category/:name
    ↓
TerraformController.getModuleDetails()
    │
    ├─ Fetch Module
    │   └─ ModuleRegistryService.getModule(category, name)
    │       ├─ Locate module files
    │       ├─ Parse main.tf
    │       ├─ Parse variables.tf
    │       ├─ Parse outputs.tf
    │       └─ Return module definition
    │
    ├─ Fetch Metadata
    │   └─ ModuleRegistryService.getModuleMetadata(category, name)
    │       └─ File stats, dependencies
    │
    └─ Return Module Details
        └─ ResponseView.success({ module, metadata })
```

**Error Cases**:
- 404: Module not found
- 500: Module loading error

---

### POST /api/modules/validate

**Purpose**: Validate module configuration against module schema

**Authentication**: None

**Request Body**:
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

**Response** (Valid):
```json
{
  "success": true,
  "data": {
    "validation": {
      "valid": true,
      "errors": [],
      "warnings": []
    },
    "module": "networking/vpc",
    "configuration": {
      "cidr_block": "10.0.0.0/16",
      "enable_dns_hostnames": true
    }
  },
  "message": "Module configuration validation completed",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Response** (Invalid):
```json
{
  "success": true,
  "data": {
    "validation": {
      "valid": false,
      "errors": [
        "Missing required variable: cidr_block",
        "Invalid value for enable_dns_hostnames: must be boolean"
      ],
      "warnings": [
        "Optional variable enable_dns_support not provided, using default"
      ]
    },
    "module": "networking/vpc",
    "configuration": { ... }
  },
  "message": "Module configuration validation completed",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
POST /api/modules/validate
    ↓
TerraformController.validateModuleConfiguration()
    │
    ├─ 1. Validate Request
    │   └─ Check category, name, configuration present
    │
    ├─ 2. Load Module Schema
    │   └─ ModuleRegistryService.getModule(category, name)
    │
    ├─ 3. Validate Configuration
    │   └─ ModuleRegistryService.validateModuleConfiguration()
    │       ├─ Check required variables
    │       ├─ Validate variable types
    │       ├─ Validate variable values
    │       ├─ Check for unknown variables
    │       └─ Return validation result
    │
    └─ 4. Return Validation Result
        └─ ResponseView.success({ validation, module, configuration })
```

**Validation Checks**:
1. All required variables are provided
2. Variable types match schema (string, number, bool, list, map)
3. Variable values are valid (e.g., valid CIDR blocks, valid instance types)
4. No unknown variables provided
5. Dependencies are satisfied

**Error Cases**:
- 400: Missing required fields (category, name, configuration)
- 404: Module not found
- 500: Validation processing error

---

### POST /api/modules/refresh

**Purpose**: Refresh module registry by re-scanning module files

**Authentication**: None (consider adding admin auth)

**Request**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "modulesLoaded": 15,
    "categories": ["networking", "compute", "storage", "security"]
  },
  "message": "Module registry refreshed successfully",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
POST /api/modules/refresh
    ↓
TerraformController.refreshModuleRegistry()
    │
    ├─ Refresh Registry
    │   └─ ModuleRegistryService.refresh()
    │       ├─ Clear existing cache
    │       ├─ Scan module directories
    │       ├─ Parse all module files
    │       ├─ Build module index
    │       └─ Cache modules in memory
    │
    ├─ Get Updated Modules
    │   └─ ModuleRegistryService.getAvailableModules()
    │
    └─ Return Refresh Summary
        └─ ResponseView.success({
              modulesLoaded,
              categories
           })
```

**Use Cases**:
- After adding new module files
- After updating existing modules
- After system startup (if needed)

**Error Cases**:
- 500: Module scanning error
- 500: Module parsing error

---

## File Management APIs

### GET /api/terraform-files

**Purpose**: Get list of all generated Terraform files

**Authentication**: None

**Request**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "name": "main.tf",
        "path": "/path/to/output/users/sudo/my-project/main.tf",
        "size": 1024,
        "createdAt": "2025-12-17T10:00:00.000Z",
        "modifiedAt": "2025-12-17T10:00:00.000Z"
      },
      {
        "name": "variables.tf",
        "path": "/path/to/output/users/sudo/my-project/variables.tf",
        "size": 512,
        "createdAt": "2025-12-17T10:00:00.000Z",
        "modifiedAt": "2025-12-17T10:00:00.000Z"
      }
    ]
  },
  "message": "Terraform files listed successfully",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
GET /api/terraform-files
    ↓
TerraformController.getTerraformFiles()
    │
    ├─ List Files
    │   └─ FileService.getTerraformFiles()
    │       ├─ Scan output directory
    │       ├─ Filter .tf files
    │       ├─ Get file stats
    │       └─ Return file list
    │
    └─ Return File List
        └─ ResponseView.terraformFilesList(files)
```

**Error Cases**:
- 500: File system error

---

### GET /api/terraform-files/:filename

**Purpose**: Get content of a specific Terraform file

**Authentication**: None

**Request Parameters**:
- `filename` (path parameter): Name of the file (e.g., "main.tf")
- `projectId` (query parameter, optional): Project identifier

**Response**:
```json
{
  "success": true,
  "data": {
    "filename": "main.tf",
    "content": "terraform {\n  required_version = \">= 1.0\"\n}\n\n...",
    "size": 1024,
    "encoding": "utf-8"
  },
  "message": "File content retrieved successfully",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
GET /api/terraform-files/:filename
    ↓
ValidationMiddleware.validateFileName()
    │   └─ Check for path traversal attacks
    ↓
TerraformController.getTerraformFileContent()
    │
    ├─ Read File
    │   └─ FileService.getTerraformFileContent(filename, projectId)
    │       ├─ Resolve file path
    │       ├─ Security check (no path traversal)
    │       ├─ Read file content
    │       └─ Return content
    │
    └─ Return File Content
        └─ ResponseView.success({ filename, content, size })
```

**Error Cases**:
- 400: Invalid filename
- 404: File not found
- 500: File read error

---

### GET /api/terraform-files/:filename/download

**Purpose**: Download Terraform file as attachment

**Authentication**: None

**Request Parameters**:
- `filename` (path parameter): Name of the file (e.g., "main.tf")

**Response**: File download (Content-Type: application/octet-stream)

**Detailed Flow**:

```
GET /api/terraform-files/:filename/download
    ↓
ValidationMiddleware.validateFileName()
    ↓
TerraformController.downloadTerraformFile()
    │
    ├─ Resolve File Path
    │   └─ FileService.getFilePath(filename)
    │
    ├─ Security Check
    │   └─ Validate path is within allowed directory
    │
    └─ Send File
        └─ res.download(filePath, filename)
```

**Error Cases**:
- 400: Invalid filename
- 404: File not found
- 500: File download error

---

## Project Management APIs

### GET /api/projects

**Purpose**: Get list of all available projects

**Authentication**: None

**Request**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "name": "my-project",
        "path": "/path/to/output/users/sudo/my-project",
        "createdAt": "2025-12-17T10:00:00.000Z",
        "modifiedAt": "2025-12-17T10:00:00.000Z",
        "fileCount": 5,
        "size": 5120
      },
      {
        "name": "another-project",
        "path": "/path/to/output/users/sudo/another-project",
        "createdAt": "2025-12-16T15:00:00.000Z",
        "modifiedAt": "2025-12-16T15:00:00.000Z",
        "fileCount": 7,
        "size": 8192
      }
    ],
    "totalProjects": 2
  },
  "message": "Projects retrieved successfully",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
GET /api/projects
    ↓
TerraformController.getProjects()
    │
    ├─ List Projects
    │   └─ FileService.getProjects()
    │       ├─ Scan output directory
    │       ├─ Get project directories
    │       ├─ Get project stats
    │       └─ Return project list
    │
    └─ Return Project List
        └─ ResponseView.success({ projects, totalProjects })
```

**Error Cases**:
- 500: File system error

---

### GET /api/projects/:projectName/files

**Purpose**: Get list of files in a specific project

**Authentication**: None

**Request Parameters**:
- `projectName` (path parameter): Name of the project

**Response**:
```json
{
  "success": true,
  "data": {
    "projectName": "my-project",
    "files": [
      {
        "name": "main.tf",
        "path": "main.tf",
        "size": 1024,
        "type": "file"
      },
      {
        "name": "variables.tf",
        "path": "variables.tf",
        "size": 512,
        "type": "file"
      }
    ],
    "totalFiles": 2
  },
  "message": "Project files retrieved successfully",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
GET /api/projects/:projectName/files
    ↓
TerraformController.getProjectFiles()
    │
    ├─ List Files
    │   └─ FileService.getProjectFiles(projectName)
    │       ├─ Resolve project path
    │       ├─ List directory contents
    │       ├─ Get file stats
    │       └─ Return file list
    │
    └─ Return File List
        └─ ResponseView.success({ projectName, files, totalFiles })
```

**Error Cases**:
- 404: Project not found
- 500: File system error

---

### GET /api/projects/:projectName/structure

**Purpose**: Get hierarchical structure of a project

**Authentication**: None

**Request Parameters**:
- `projectName` (path parameter): Name of the project

**Response**:
```json
{
  "success": true,
  "data": {
    "projectName": "my-project",
    "structure": {
      "name": "my-project",
      "type": "directory",
      "children": [
        {
          "name": "main.tf",
          "type": "file",
          "size": 1024
        },
        {
          "name": "modules",
          "type": "directory",
          "children": [
            {
              "name": "vpc",
              "type": "directory",
              "children": [
                {
                  "name": "main.tf",
                  "type": "file",
                  "size": 512
                }
              ]
            }
          ]
        }
      ]
    }
  },
  "message": "Project structure retrieved successfully",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
GET /api/projects/:projectName/structure
    ↓
TerraformController.getProjectStructure()
    │
    ├─ Build Structure
    │   └─ FileService.getProjectStructure(projectName)
    │       ├─ Resolve project path
    │       ├─ Recursively traverse directory tree
    │       ├─ Build hierarchical structure
    │       └─ Return structure object
    │
    └─ Return Structure
        └─ ResponseView.success({ projectName, structure })
```

**Error Cases**:
- 404: Project not found
- 500: File system error

---

### DELETE /api/projects/:projectName

**Purpose**: Delete a project and all its files

**Authentication**: None (consider adding auth)

**Request Parameters**:
- `projectName` (path parameter): Name of the project to delete

**Response**:
```json
{
  "success": true,
  "data": {
    "projectName": "my-project",
    "deleted": true
  },
  "message": "Project deleted successfully",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

**Detailed Flow**:

```
DELETE /api/projects/:projectName
    ↓
TerraformController.deleteProject()
    │
    ├─ Delete Project
    │   └─ FileService.deleteProject(projectName)
    │       ├─ Resolve project path
    │       ├─ Security check (within allowed directory)
    │       ├─ Recursively delete directory
    │       └─ Return success
    │
    └─ Return Deletion Result
        └─ ResponseView.success({ projectName, deleted: true })
```

**Error Cases**:
- 404: Project not found or couldn't be deleted
- 500: File system error

---

### GET /api/projects/:projectName/download

**Purpose**: Download entire project as ZIP archive

**Authentication**: None

**Request Parameters**:
- `projectName` (path parameter): Name of the project

**Response**: ZIP file download (Content-Type: application/zip)

**Detailed Flow**:

```
GET /api/projects/:projectName/download
    ↓
TerraformController.downloadProjectZip()
    │
    ├─ Check Project Exists
    │   └─ FileService.projectExists(projectName)
    │
    ├─ Create ZIP Archive
    │   └─ FileService.createProjectZip(projectName)
    │       ├─ Create temporary ZIP file
    │       ├─ Add all project files to ZIP
    │       ├─ Compress archive
    │       └─ Return ZIP path
    │
    ├─ Send ZIP File
    │   └─ res.download(zipPath, `${projectName}.zip`)
    │
    └─ Cleanup (after download)
        └─ Delete temporary ZIP file
```

**Error Cases**:
- 404: Project not found
- 500: ZIP creation error
- 500: File download error

---

## Data Models

### ArchitectureData

```typescript
interface ArchitectureData {
  metadata: {
    name: string;
    description?: string;
    version: string;
    createdAt: string;
    lastModified: string;
    provider: string;  // "aws", "azure", "gcp"
  };
  nodes: ArchitectureNode[];
  connections: NodeConnection[];
  variables?: Record<string, any>;
  outputs?: Record<string, any>;
}
```

### ArchitectureNode

```typescript
interface ArchitectureNode {
  id: string;                    // Unique identifier
  nodeType: 'awsService' | 'awsContainer';
  resourceType: string;          // "aws-vpc", "aws-ec2", etc.
  name: string;                  // Resource name
  configuration: Record<string, any>;  // Resource-specific config
  parentId?: string;             // For nested resources
}
```

### NodeConnection

```typescript
interface NodeConnection {
  id: string;
  source: string;                // Source node ID
  target: string;                // Target node ID
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;                 // Connection type
}
```

### ApiResponse

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: string;
  timestamp?: string;
}
```

### TerraformJob

```typescript
interface TerraformJob {
  jobId: string;
  projectName: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;              // 0-100
  message: string;
  result?: {
    summary?: {
      add: number;
      change: number;
      destroy: number;
    };
    changes?: any[];
    outputs?: Record<string, any>;
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
  logs?: string[];
  rawOutput?: string;
}
```

---

## Error Handling

### Error Response Format

All errors return the standard response format with `success: false`:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful synchronous operation |
| 202 | Accepted | Async job created successfully |
| 400 | Bad Request | Invalid input, missing required fields |
| 404 | Not Found | Resource not found (file, project, job, module) |
| 500 | Internal Server Error | Server-side processing error |

### Common Error Scenarios

#### 400 Bad Request

**Causes**:
- Missing required fields in request body
- Invalid data format
- Invalid filename (path traversal attempt)
- Validation failure

**Example**:
```json
{
  "success": false,
  "error": "Architecture data is required",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

#### 404 Not Found

**Causes**:
- Job ID not found
- Project not found
- Module not found
- File not found

**Example**:
```json
{
  "success": false,
  "error": "Module networking/vpc not found",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

#### 500 Internal Server Error

**Causes**:
- File system errors
- Terraform execution errors
- Module parsing errors
- Unexpected exceptions

**Example**:
```json
{
  "success": false,
  "error": "Failed to generate modular Terraform configuration",
  "details": "Module mapping failed: Invalid resource type",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

### Logging

All errors are logged with detailed context:

```typescript
logger.error('Error message', {
  requestId: req.requestId,
  error: error.message,
  stack: error.stack,
  category: LogCategory.TERRAFORM,
  component: 'TerraformController',
  duration: Date.now() - startTime
});
```

**Log Categories**:
- `APP`: Application-level logs
- `TERRAFORM`: Terraform operations
- `VALIDATION`: Validation operations
- `MODULE`: Module management
- `FILE`: File operations
- `ARCHITECTURE`: Architecture processing

---

## Authentication & Security

### Current Status

**Authentication**: Currently not implemented (all endpoints are public)

**Recommended Implementation**:
1. Add JWT-based authentication
2. Implement role-based access control (RBAC)
3. Add API rate limiting
4. Implement request logging for audit trails

### Security Measures

#### Filename Validation

All file operations validate filenames to prevent path traversal attacks:

```typescript
ValidationMiddleware.validateFileName()
  - Rejects filenames with: ../, ..\, absolute paths
  - Only allows alphanumeric, dash, underscore, dot
```

#### Input Validation

All architecture data is validated:

```typescript
ValidationMiddleware.validateArchitectureData()
  - Validates required fields
  - Checks data types
  - Validates structure
```

#### File System Security

All file operations are scoped to output directory:

```typescript
FileService operations:
  - Resolve paths relative to output directory
  - Validate resolved path is within allowed directory
  - Reject path traversal attempts
```

### Recommended Security Enhancements

1. **Authentication**:
   ```typescript
   router.post('/api/terraform/generate',
     AuthMiddleware.requireAuth,
     ValidationMiddleware.validateArchitectureData,
     TerraformController.generateModularTerraform
   );
   ```

2. **Rate Limiting**:
   ```typescript
   import rateLimit from 'express-rate-limit';

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,  // 15 minutes
     max: 100  // limit each IP to 100 requests per windowMs
   });

   router.use('/api/', limiter);
   ```

3. **API Keys**:
   ```typescript
   router.use('/api/', ApiKeyMiddleware.validateApiKey);
   ```

4. **CORS Configuration**:
   ```typescript
   app.use(cors({
     origin: process.env.ALLOWED_ORIGINS?.split(','),
     credentials: true
   }));
   ```

5. **Input Sanitization**:
   - Sanitize all user inputs
   - Validate against injection attacks
   - Use parameterized queries if database is added

---

## Appendix

### API Testing Examples

#### Using cURL

**Generate Terraform**:
```bash
curl -X POST http://localhost:3000/api/terraform/generate \
  -H "Content-Type: application/json" \
  -d '{
    "architectureData": {
      "metadata": {
        "name": "test-infra",
        "version": "1.0.0",
        "createdAt": "2025-12-17T10:00:00.000Z",
        "lastModified": "2025-12-17T10:00:00.000Z",
        "provider": "aws"
      },
      "nodes": [],
      "connections": []
    },
    "projectName": "test-project"
  }'
```

**Get Plan Status**:
```bash
curl http://localhost:3000/api/terraform/plan-status/plan-1234567890
```

**Download Project**:
```bash
curl -O http://localhost:3000/api/projects/my-project/download
```

#### Using Postman

1. Import collection with all endpoints
2. Set environment variables:
   - `BASE_URL`: http://localhost:3000
   - `PROJECT_NAME`: my-project
3. Use collection runner for integration testing

### Performance Considerations

**Synchronous Operations** (immediate response):
- `/terraform/generate`: 2-5 seconds (depends on complexity)
- `/validate/architecture`: <1 second
- `/modules`: <500ms
- File operations: <500ms

**Asynchronous Operations** (job-based):
- `/terraform/plan`: 30-60 seconds
- `/terraform/apply`: 2-5 minutes
- `/terraform/destroy`: 2-5 minutes

**Polling Recommendations**:
- Poll status every 2-3 seconds
- Implement exponential backoff
- Set maximum polling timeout (5 minutes)

### Best Practices

1. **Always validate before generating**:
   ```
   POST /api/validate/architecture
   POST /api/validate/dependencies
   POST /api/terraform/generate
   ```

2. **Use async operations for production**:
   - Use `/terraform/plan` instead of `/terraform/generate` when you need to execute Terraform
   - Poll status endpoints regularly
   - Handle all job states (queued, running, completed, failed)

3. **Clean up completed jobs**:
   ```
   DELETE /api/terraform/plan-jobs/:jobId
   ```

4. **Download projects for backup**:
   ```
   GET /api/projects/:projectName/download
   ```

5. **Refresh modules after updates**:
   ```
   POST /api/modules/refresh
   ```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-17 | System | Initial comprehensive documentation |

---

**End of Documentation**
