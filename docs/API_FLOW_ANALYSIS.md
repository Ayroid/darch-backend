# API Flow Analysis: /terraform/generate & /terraform/plan

**Generated on:** 13 September 2025
**Repository:** Darch-Backend
**Branch:** feature/frontend-connectivity

## Overview

This document provides a comprehensive analysis of the exact function call flow for the `/terraform/generate` and `/terraform/plan` API endpoints in the Darch backend system.

## API Endpoints Overview

| Endpoint | Purpose | File Generation | Terraform Execution | Performance |
|----------|---------|-----------------|-------------------|-------------|
| `POST /api/terraform/generate` | Full terraform file generation | ✅ Creates actual .tf files | ❌ No terraform commands | Slower (file I/O) |
| `POST /api/terraform/plan` | Quick plan preview | ❌ No files created | ❌ No terraform commands | Faster (in-memory only) |
| `POST /api/terraform/plan-execute` | Async terraform execution | ✅ Creates files + runs terraform | ✅ Actual terraform init/plan | Async job-based |

## Detailed Flow Analysis

### POST `/terraform/generate` API Flow

#### 1. Request Entry Point
```typescript
Route: /api/terraform/generate
├── ValidationMiddleware.validateArchitectureData()
│   └── ValidationUtils.validateArchitectureData()
└── TerraformController.generateModularTerraform()
```

#### 2. Architecture Data Processing

**Format Detection & Transformation:**
```typescript
TerraformController.generateModularTerraform()
├── TerraformController.isFrontendFormat() - Detects frontend format
│   └── Checks for: nodeType === 'awsService'/'awsContainer', resourceType.startsWith('aws-')
└── Format-specific processing:
```

**Frontend Format Flow:**
```typescript
FrontendArchitectureTransformerService.validateFrontendData()
└── FrontendArchitectureTransformerService.transformToBackendFormat()
    ├── Transforms frontend nodes to backend format
    ├── Maps frontend resource types to backend types
    └── Returns transformation result with mappings
```

#### 3. Architecture Parsing & Validation

**Main Parsing Flow:**
```typescript
ArchitectureParserService.parseArchitecture(processedArchitectureData)
├── parseNodes(architectureData.nodes)
│   ├── mapResourceTypeToModule() - Maps resource types to terraform modules
│   │   └── Module mappings: vpc→networking/vpc, ec2→compute/ec2, etc.
│   └── normalizeConfiguration() - Ensures consistent config structure
├── parseConnections(architectureData.connections)
│   └── Creates ParsedConnection objects with source/target relationships
├── parseMetadata(architectureData.metadata)
│   └── Sets defaults: provider='aws', region='us-east-1', environment='development'
├── buildDependencyGraph(parsedNodes, parsedConnections)
│   ├── Adds parent dependencies (child depends on parent)
│   ├── Adds connection-based dependencies
│   └── addImplicitDependencies() - Adds AWS-specific dependencies
│       ├── Subnets depend on VPC
│       ├── EC2 depends on subnets + security groups
│       └── Security groups depend on VPC
└── validateArchitecture(parsedNodes, parsedConnections, metadata)
    ├── validateNode() - Validates individual nodes
    │   ├── getRequiredFields() - Gets required fields per module type
    │   ├── validateCidrBlocks() - Validates CIDR format and overlaps
    │   └── validateSecurityGroup() - Checks for overly permissive rules
    ├── validateDependencies() - Checks for circular dependencies
    ├── validateConnections() - Validates connection references
    └── validateArchitecturePatterns() - Best practice validations
```

#### 4. Module Mapping

**Core Mapping Process:**
```typescript
ModuleMapperService.mapArchitectureToModules(parsedArchitecture)
├── topologicalSort(parsedArchitecture.nodes) - Orders nodes by dependencies
│   └── Detects circular dependencies and sorts for proper creation order
├── For each node: mapNodeToModule(node, metadata)
│   ├── ModuleRegistryService.getModule(category, moduleName)
│   │   └── Retrieves module definition from registry
│   ├── generateModuleInstanceName(node) - Creates unique instance names
│   │   └── Format: {sanitized_name}_{hash} (e.g., "web_server_abc123")
│   ├── mapConfigurationToVariables(node, moduleDefinition, metadata)
│   │   ├── mapVariableValue() - Maps individual variables
│   │   │   ├── Direct config mapping: config[varName]
│   │   │   ├── Common mappings: name, region, availability_zone
│   │   │   ├── generateDefaultCidr() - Default CIDR blocks
│   │   │   ├── generateResourceReference() - Module output references
│   │   │   └── inferSubnetType() - Public/private subnet inference
│   │   └── Adds common tags: Name, ResourceType, NodeId, etc.
│   └── generateModuleOutputs() - Creates output mappings
├── buildModuleDependencies(modules, sortedNodes)
│   ├── Maps node dependencies to module dependencies
│   └── calculateDependencyLevel() - Calculates dependency hierarchy levels
└── Returns: ModuleMappingResult with modules, dependencies, errors, warnings
```

#### 5. Terraform Configuration Generation

**File Generation Process:**
```typescript
ModularTerraformGeneratorService.generateTerraformConfiguration(mappingResult, metadata, projectName)
├── generateMainTf(modules, dependencies, metadata)
│   ├── generateLocalsBlock() - Common tags and name_prefix
│   ├── Sort modules by dependency level
│   └── generateModuleBlock() for each module
│       ├── Module source path: ../../../../../data/terraform-modules/{category}/{name}
│       ├── formatTerraformValue() - Formats variables for HCL syntax
│       └── Adds depends_on for dependencies
├── generateVariablesTf(modules, metadata)
│   ├── Common variables: aws_region, environment, project_name, common_tags
│   ├── extractUniqueVariables() - Gets unique vars from all modules
│   ├── generateVariableBlock() - Creates variable definitions
│   ├── inferVariableType() - Determines Terraform variable types
│   └── generateVariableDescription() - Creates descriptions
├── generateOutputsTf(modules)
│   └── Creates outputs for all module outputs with naming: {module_name}_{output_name}
├── generateTerraformTfvars(modules, metadata)
│   └── Sets default values for all variables
└── generateProvidersVersionsTf(metadata)
    ├── Terraform version constraint: >= 1.0
    ├── AWS provider: ~> 5.0
    └── Provider configuration with default_tags
```

**File Structure Generated:**
- `main.tf` - Module definitions with dependencies
- `variables.tf` - Input variable declarations
- `outputs.tf` - Output value definitions
- `terraform.tfvars` - Variable value assignments
- `providers.tf` - Provider and version constraints

#### 6. File Management & Persistence

**Saving Process:**
```typescript
FileService.saveGeneratedTerraformFiles(terraformResult, projectName)
├── ensureInitialized() - Initializes LocalFileManager
├── Creates unique project ID: {projectName}-{timestamp}
├── Converts TerraformGenerationResult to Record<string, string>
└── LocalFileManager.createUserProject(uniqueProjectId, terraformFiles)
    ├── Creates project directory structure
    ├── Saves all .tf files to disk
    └── Returns project path and file list
```

**File Structure Created:**
```
/src/output/users/root-user/{project-name-timestamp}/
├── generated/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── terraform.tfvars
│   └── providers.tf
└── metadata.json
```

#### 7. Validation & Response

**Final Validation:**
```typescript
ModularTerraformGeneratorService.validateTerraformSyntax(terraformResult.mainTf)
├── validateBraces() - Checks brace matching
├── validateQuotes() - Checks quote matching
├── Checks for required blocks: terraform{}, provider{}
└── Returns validation result with errors
```

**Response Formation:**
```typescript
ResponseView.success({
  project: { name, path, generatedAt },
  files: { generated: count, list: filenames },
  validation: { syntaxValid, errors },
  architectureValidation: { valid, errorCount, warningCount },
  moduleMapping: { modulesGenerated, dependencies, warnings },
  formatUsed: 'frontend'|'clean'|'legacy',
  status: 'success'
})
```

---

### POST `/terraform/plan` API Flow

#### 1. Request Entry Point
```typescript
Route: /api/terraform/plan
├── ValidationMiddleware.validateArchitectureData()
└── TerraformController.generateTerraformPlan()
```

#### 2. Lightweight Processing
**Same parsing and mapping as `/terraform/generate` but without file generation:**

```typescript
TerraformController.generateTerraformPlan()
├── ArchitectureParserService.parseArchitecture(architectureData)
│   └── [Same parsing flow as /generate endpoint]
├── ModuleMapperService.mapArchitectureToModules(parsedArchitecture)
│   └── [Same mapping flow as /generate endpoint]
├── generateResourceSummary(mappingResult.modules)
│   ├── Counts total resources
│   ├── Groups by resource categories
│   └── Returns resource type breakdown
├── generateCostEstimate(mappingResult.modules)
│   ├── Basic cost mapping: ec2=$15/month, rds=$25/month, s3=$5/month
│   ├── Calculates total monthly estimate
│   └── Provides cost breakdown by resource type
└── ResponseView.success() - Returns plan preview
```

#### 3. Response Structure
```typescript
{
  resourceSummary: {
    totalResources: number,
    resourceTypes: Record<string, number>,
    modules: number
  },
  costEstimate: {
    monthlyEstimate: number,
    breakdown: Record<string, number>,
    currency: 'USD',
    disclaimer: string
  },
  modules: [{ name, source, variableCount }],
  dependencies: number,
  warnings: string[]
}
```

---

### POST `/terraform/plan-execute` API Flow (Async Terraform Execution)

#### 1. Request Processing
```typescript
TerraformController.startTerraformPlanExecution()
├── [Same generation flow as /terraform/generate]
├── Saves terraform files to disk
└── TerraformExecutionService.startTerraformPlan(projectPath, architectureData, projectName)
```

#### 2. Async Job Management
```typescript
TerraformExecutionService.startTerraformPlan()
├── Generates unique jobId: plan_{timestamp}_{random}
├── Creates JobStatus object with initial state
├── processTerraformPlan() - Async execution
│   ├── updateJob() - Updates job status
│   ├── addLog() - Streams log entries
│   ├── checkTerraformInstallation() - Verifies terraform binary
│   ├── ensureDirectoryExists() - Creates project directory
│   ├── checkTerraformInit() - Checks for .terraform directory
│   ├── runTerraformInit() - Runs 'terraform init' if needed
│   │   └── Streams init output to job logs
│   ├── runTerraformPlan() - Runs 'terraform plan -no-color'
│   │   └── Streams plan output to job logs
│   ├── extractResourceCount() - Parses plan output for resource counts
│   ├── extractModuleCount() - Counts modules in plan
│   └── extractWarnings() - Extracts warning messages
└── Returns jobId for polling
```

#### 3. Job Status Polling
```typescript
GET /api/terraform/plan-status/{jobId}
└── TerraformController.getTerraformPlanStatus()
    └── TerraformExecutionService.getJobStatus(jobId)
        └── Returns current job status, progress, logs, and results
```

---

## Service Dependencies

### Core Service Hierarchy
```
TerraformController
├── ValidationMiddleware
│   └── ValidationUtils
├── ArchitectureParserService
├── ArchitectureConverterService
├── FrontendArchitectureTransformerService
├── ModuleMapperService
│   └── ModuleRegistryService
├── ModularTerraformGeneratorService
├── FileService
│   └── LocalFileManager
├── TerraformExecutionService
└── ResponseView
```

### Key Data Models
```typescript
// Input Models
ArchitectureData | CleanArchitectureData | FrontendArchitectureData

// Parsed Models
ParsedArchitecture { nodes, connections, metadata, validation }
ParsedNode { id, name, resourceType, configuration, dependencies, terraformModule }

// Mapping Models
ModuleMappingResult { modules, dependencies, errors, warnings }
GeneratedModule { name, source, variables, outputs }

// Generation Models
TerraformGenerationResult { mainTf, variablesTf, outputsTf, terraformTfvars, providersVersionsTf, files }

// Execution Models
JobStatus { id, status, progress, message, result, error, logs, rawOutput }
```

---

## Key Differences Summary

| Feature | `/terraform/generate` | `/terraform/plan` | `/terraform/plan-execute` |
|---------|---------------------|-------------------|---------------------------|
| **File Creation** | ✅ Full terraform files | ❌ No files | ✅ Full terraform files |
| **Terraform Commands** | ❌ None | ❌ None | ✅ init + plan |
| **Response Type** | Synchronous | Synchronous | Async (job-based) |
| **Output** | Project structure + validation | Resource summary + cost estimate | Streaming logs + plan output |
| **Use Case** | Generate downloadable terraform | Quick preview/validation | Full terraform analysis |
| **Performance** | Medium (file I/O) | Fast (memory only) | Slow (terraform execution) |

---

## Module Registry Integration

The system uses a local module registry located at `/src/data/terraform-modules/` with the following structure:

```
terraform-modules/
├── compute/
│   └── ec2/
├── networking/
│   ├── vpc/
│   └── subnet/
├── security/
│   └── security-group/
└── storage/
    └── s3/
```

Each module contains standard Terraform module files (`main.tf`, `variables.tf`, `outputs.tf`) and is referenced using relative paths in the generated configuration.

---

*This document provides a comprehensive technical reference for understanding the complete flow of terraform generation and planning APIs in the Darch system.*
