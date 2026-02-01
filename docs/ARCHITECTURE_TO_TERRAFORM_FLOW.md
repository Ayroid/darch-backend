# Architecture to Terraform Flow

This document describes the complete flow from creating an architecture diagram in the frontend to generating production-grade Terraform code in the backend.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  React Flow Canvas → Architecture Store (Zustand) → API Request             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  TerraformController                                                         │
│       │                                                                      │
│       ├─► ArchitectureNormalizerService (Normalize + Validate + Resolve)    │
│       │       │                                                              │
│       │       ├─► normalizeResources()                                       │
│       │       ├─► buildDependencyGraph()                                     │
│       │       ├─► buildModuleReferenceMap()                                  │
│       │       └─► resolveCrossReferences()                                   │
│       │                                                                      │
│       ├─► SimplifiedTerraformGeneratorService (Generate HCL)                │
│       │       │                                                              │
│       │       ├─► generateModules()                                          │
│       │       ├─► generateMainTf()                                           │
│       │       ├─► generateVariablesTf()                                      │
│       │       ├─► generateOutputsTf()                                        │
│       │       └─► generateProvidersVersionsTf()                              │
│       │                                                                      │
│       └─► FileService (Persist files)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Frontend: Diagram Creation

### 1.1 Architecture Store (`frontend/lib/stores/architecture/architecture-store.ts`)

The frontend uses Zustand for state management. When users add AWS resources to the canvas:

```typescript
// Resource type normalization (ensures consistent aws- prefix)
const normalizeResourceType = (resourceType: string): string => {
  if (!resourceType) return "unknown";
  let normalized = resourceType.toLowerCase().trim();
  if (!normalized.startsWith("aws-")) {
    normalized = `aws-${normalized}`;
  }
  return normalized;
};

// Extract resource type from node data
const getResourceType = (data: Record<string, unknown>): string => {
  if (typeof data?.serviceId === "string") {
    return normalizeResourceType(data.serviceId);
  }
  if (typeof data?.name === "string") {
    return normalizeResourceType(data.name);
  }
  return "unknown";
};
```

### 1.2 Data Structure Sent to Backend

```typescript
interface FrontendArchitectureData {
  metadata: {
    provider: string;        // "aws"
    region: string;          // "us-east-1"
    environment: string;     // "development"
    project: string;         // Project name
    created_at: string;      // ISO timestamp
    last_modified: string;   // ISO timestamp
  };
  resources: FrontendResource[];
  connections: NodeConnection[];
}

interface FrontendResource {
  id: string;                // "aws-vpc-lxys3o"
  name: string;              // "VPC"
  resource_type: string;     // "aws-vpc"
  node_type: string;         // "aws_service" | "aws_container"
  parent_id?: string;        // Parent resource ID for hierarchy
  configuration: Record<string, any>;
}

interface NodeConnection {
  id: string;
  source_id: string;         // Source node ID
  target_id: string;         // Target node ID
  source_handle?: string;
  target_handle?: string;
}
```

---

## 2. Backend: API Endpoint

### 2.1 TerraformController (`backend/src/controllers/TerraformController.ts`)

Entry point: `POST /api/terraform/generate`

```typescript
static async generateModularTerraform(req: Request, res: Response): Promise<void> {
  const { architectureData, projectName } = req.body;

  // STAGE 1: Unified Architecture Normalization
  const normalizationResult = await ArchitectureNormalizerService.normalizeArchitecture(
    architectureData,
    projectName
  );

  // STAGE 2: Direct Terraform Generation
  const terraformResult = await SimplifiedTerraformGeneratorService.generateTerraformConfiguration(
    normalizationResult.architecture,
    projectName
  );

  // STAGE 3: File Persistence
  const savedFiles = await FileService.saveGeneratedTerraformFiles(
    terraformResult,
    projectName
  );
}
```

---

## 3. Backend: Architecture Normalization

### 3.1 ArchitectureNormalizerService (`backend/src/services/ArchitectureNormalizerService.ts`)

This is the core service that:
- Auto-detects input format (frontend/backend)
- Normalizes resources to Terraform module format
- Builds dependency graph
- Pre-computes module references
- Resolves cross-resource references

#### Main Entry Point

```typescript
static async normalizeArchitecture(
  inputData: ArchitectureData | FrontendArchitectureData,
  projectName: string = "infrastructure"
): Promise<NormalizationResult> {

  // Step 1: Detect format
  const isFrontend = this.isFrontendFormat(inputData);

  // Step 2: Normalize metadata
  const metadata = this.normalizeMetadata(inputData.metadata, projectName);

  // Step 3: Normalize resources (single pass)
  const { resources } = await this.normalizeResources(inputData, isFrontend, metadata);

  // Step 4: Normalize connections
  const { connections } = this.normalizeConnections(inputData.connections || [], resources);

  // Step 5: Build dependency graph
  this.buildDependencyGraph(resources, connections);

  // Step 6: Topological sort for dependency order
  const dependencyOrder = this.topologicalSort(resources);

  // Step 7: Build module reference map
  const moduleReferenceMap = this.buildModuleReferenceMap(resources);

  // Step 8: Resolve cross-resource references
  this.resolveCrossReferences(resources, moduleReferenceMap);

  // Step 9: Validate architecture
  const validation = this.validateArchitecture(resources, connections, metadata);

  return { architecture: { ... }, warnings, errors };
}
```

### 3.2 Resource Type Normalization

Maps frontend resource types to Terraform modules:

```typescript
const CANONICAL_MODULE_MAP: Record<string, string> = {
  "vpc": "networking/vpc",
  "subnet": "networking/subnet",
  "internet-gateway": "networking/internet-gateway",
  "nat-gateway": "networking/nat-gateway",
  "route-table": "networking/route-table",
  "ec2": "compute/ec2",
  "security-group": "security/security-group",
  "s3": "storage/s3",
  "rds": "database/rds",
};

function normalizeResourceType(resourceType: string): string {
  let normalized = resourceType.toLowerCase().trim();

  // Remove aws- prefix
  normalized = normalized.replace(/^aws-/, "");

  // Handle subnet variants
  if (normalized.includes("subnet")) return "subnet";

  // Handle aliases
  const aliases: Record<string, string> = {
    "igw": "internet-gateway",
    "ngw": "nat-gateway",
    "rt": "route-table",
    "instance": "ec2",
    "bucket": "s3",
    "s3-bucket": "s3",
    "database": "rds",
    "sg": "security-group",
  };

  return aliases[normalized] || normalized;
}
```

### 3.3 Module Name Generation

```typescript
private static generateModuleName(resource: any): string {
  const baseName = resource.name || resource.id;
  const sanitized = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");

  const hash = resource.id.slice(-6);
  return `${sanitized}_${hash}`;  // e.g., "vpc_lxys3o"
}
```

### 3.4 Cross-Reference Resolution

The key innovation - resolves node IDs to module references:

```typescript
// Detect if a value is a node ID needing resolution
private static isNodeId(value: any): boolean {
  if (typeof value !== "string") return false;
  // Matches: aws-vpc-abc123, aws-ec2-xyz789, aws-security-group-def456
  return value.match(/^aws-[a-z0-9-]+-[a-z0-9]+$/i) !== null;
}

// Resolve node ID to module reference
private static resolveNodeIdToModuleRef(
  nodeId: string,
  outputName: string,
  moduleReferenceMap: Map<string, ModuleReference>
): string {
  const ref = moduleReferenceMap.get(nodeId);
  if (ref) {
    return ref.outputs[outputName] || `module.${ref.moduleName}.${outputName}`;
  }
  return nodeId;
}

// Main resolution logic
private static resolveCrossReferences(
  resources: NormalizedResource[],
  moduleReferenceMap: Map<string, ModuleReference>
): void {
  for (const resource of resources) {
    const config = resource.configuration;

    // Resolve vpc_id
    if (config.vpc_id && this.isNodeId(config.vpc_id)) {
      config.vpc_id = this.resolveNodeIdToModuleRef(
        config.vpc_id, "vpc_id", moduleReferenceMap
      );
      // "aws-vpc-lxys3o" → "module.vpc_lxys3o.vpc_id"
    }

    // Resolve subnet_id
    if (config.subnet_id && this.isNodeId(config.subnet_id)) {
      config.subnet_id = this.resolveNodeIdToModuleRef(
        config.subnet_id, "subnet_id", moduleReferenceMap
      );
    }

    // Special handling for subnet with separate RouteTable
    if (resource.terraformModule === "networking/subnet") {
      const hasRouteTableResource = resources.some(
        r => r.terraformModule === "networking/route-table"
      );
      if (hasRouteTableResource) {
        config.create_route_table = false;
        config.create_igw_route = false;
        config.create_nat_route = false;
      }
    }

    // Auto-populate RouteTable routes and associations
    if (resource.terraformModule === "networking/route-table") {
      if (!config.routes || Object.keys(config.routes).length === 0) {
        const igw = resources.find(r =>
          r.terraformModule === "networking/internet-gateway"
        );
        if (igw) {
          const igwRef = moduleReferenceMap.get(igw.id);
          config.routes = {
            internet: {
              destination_cidr_block: "0.0.0.0/0",
              gateway_id: igwRef.outputs.internet_gateway_id
            }
          };
        }
      }
    }
  }
}
```

### 3.5 Module Reference Map

Pre-computes all module outputs for cross-referencing:

```typescript
const MODULE_OUTPUTS: Record<string, string[]> = {
  "networking/vpc": ["vpc_id", "vpc_arn", "cidr_block"],
  "networking/subnet": ["subnet_id", "subnet_arn", "availability_zone"],
  "networking/internet-gateway": ["internet_gateway_id", "internet_gateway_arn"],
  "networking/nat-gateway": ["nat_gateway_id", "nat_gateway_public_ip"],
  "networking/route-table": ["route_table_id", "route_table_arn"],
  "compute/ec2": ["instance_id", "public_ip", "private_ip"],
  "security/security-group": ["security_group_id", "security_group_arn"],
  "storage/s3": ["bucket_id", "bucket_arn", "bucket_domain_name"],
  "database/rds": ["db_instance_id", "endpoint", "address"],
};

private static buildModuleReferenceMap(
  resources: NormalizedResource[]
): Map<string, ModuleReference> {
  const map = new Map<string, ModuleReference>();

  for (const resource of resources) {
    const outputs: Record<string, string> = {};
    const moduleOutputs = MODULE_OUTPUTS[resource.terraformModule] || [];

    for (const outputName of moduleOutputs) {
      outputs[outputName] = `module.${resource.moduleName}.${outputName}`;
    }

    map.set(resource.id, {
      moduleName: resource.moduleName,
      outputs,
    });
  }

  return map;
}
```

---

## 4. Backend: Terraform Generation

### 4.1 SimplifiedTerraformGeneratorService (`backend/src/services/SimplifiedTerraformGeneratorService.ts`)

Generates production-grade HCL from normalized architecture.

#### Main Entry Point

```typescript
static async generateTerraformConfiguration(
  architecture: NormalizedArchitecture,
  projectName: string = "infrastructure"
): Promise<TerraformGenerationResult> {

  // Generate modules with resolved variables
  const modules = await this.generateModules(architecture);

  // Build dependency information
  const dependencies = this.buildDependencies(architecture);

  // Generate all Terraform files
  const mainTf = this.generateMainTf(modules, dependencies, architecture.metadata);
  const variablesTf = this.generateVariablesTf(architecture.metadata);
  const outputsTf = this.generateOutputsTf(modules);
  const terraformTfvars = this.generateTerraformTfvars(architecture.metadata);
  const providersVersionsTf = this.generateProvidersVersionsTf(architecture.metadata);

  return { mainTf, variablesTf, outputsTf, terraformTfvars, providersVersionsTf, files };
}
```

### 4.2 Module Block Generation

```typescript
private static generateModuleBlock(
  module: GeneratedModule,
  dependencyMap: Map<string, ModuleDependency>
): string {
  const lines: string[] = [];
  lines.push(`module "${module.name}" {`);
  lines.push(`  source = "${module.source}"`);
  lines.push("");

  // Categorize variables: required → references → optional → tags
  const tags: [string, any][] = [];
  const references: [string, any][] = [];
  const required: [string, any][] = [];
  const optional: [string, any][] = [];

  for (const [key, value] of Object.entries(module.variables)) {
    if (key === "tags") {
      tags.push([key, value]);
    } else if (typeof value === "string" && value.startsWith("module.")) {
      references.push([key, value]);
    } else if (requiredFields.has(key)) {
      required.push([key, value]);
    } else {
      optional.push([key, value]);
    }
  }

  // Format and output each category...

  // Add depends_on
  const dependency = dependencyMap.get(module.name);
  if (dependency?.dependsOn.length > 0) {
    lines.push("");
    lines.push("  depends_on = [");
    for (const dep of dependency.dependsOn) {
      lines.push(`    module.${dep},`);
    }
    lines.push("  ]");
  }

  lines.push("}");
  return lines.join("\n") + "\n";
}
```

### 4.3 Value Formatting for HCL

```typescript
private static formatTerraformValue(value: any, indent: number = 2): string {
  if (value === null || value === undefined) return "null";

  if (typeof value === "string") {
    // Preserve Terraform references without quotes
    if (value.match(/^(var\.|module\.|data\.|local\.|aws_)/)) {
      return value;
    }
    // Escape and quote strings
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");
    return `"${escaped}"`;
  }

  if (typeof value === "boolean") return value.toString();
  if (typeof value === "number") return value.toString();

  if (Array.isArray(value)) {
    // Handle arrays...
  }

  if (typeof value === "object") {
    // Handle objects with proper indentation...
  }

  return `"${String(value)}"`;
}
```

---

## 5. Generated Output Example

### Input: Frontend Architecture

```json
{
  "resources": [
    { "id": "aws-vpc-lxys3o", "resource_type": "aws-vpc", "configuration": { "cidr_block": "10.0.0.0/16" } },
    { "id": "aws-subnet-bg9i1u", "resource_type": "aws-subnet", "configuration": { "vpc_id": "aws-vpc-lxys3o" } },
    { "id": "aws-internet-gateway-lvwzf9", "resource_type": "aws-internet-gateway", "configuration": { "vpc_id": "aws-vpc-lxys3o" } },
    { "id": "aws-ec2-qlqfpt", "resource_type": "aws-ec2", "configuration": { "subnet_id": "aws-subnet-bg9i1u" } }
  ]
}
```

### Output: Generated main.tf

```hcl
module "vpc_lxys3o" {
  source = "../../../../data/terraform-modules/networking/vpc"

  cidr_block = "10.0.0.0/16"
  name       = "VPC"

  tags = {
    Environment = "development"
    ManagedBy   = "Terraform"
    Name        = "VPC"
  }
}

module "internetgateway_lvwzf9" {
  source = "../../../../data/terraform-modules/networking/internet-gateway"

  vpc_id = module.vpc_lxys3o.vpc_id

  tags = {
    Name = "InternetGateway"
  }

  depends_on = [
    module.vpc_lxys3o,
  ]
}

module "subnet_bg9i1u" {
  source = "../../../../data/terraform-modules/networking/subnet"

  cidr_block        = "10.0.0.0/24"
  availability_zone = "us-east-1a"

  vpc_id = module.vpc_lxys3o.vpc_id

  create_route_table = false
  create_igw_route   = false
  create_nat_route   = false

  depends_on = [
    module.vpc_lxys3o,
  ]
}

module "ec2_qlqfpt" {
  source = "../../../../data/terraform-modules/compute/ec2"

  instance_type = "t3.micro"

  subnet_id = module.subnet_bg9i1u.subnet_id

  depends_on = [
    module.subnet_bg9i1u,
  ]
}
```

---

## 6. File Structure

```
backend/
├── src/
│   ├── controllers/
│   │   └── TerraformController.ts      # API endpoints
│   ├── services/
│   │   ├── ArchitectureNormalizerService.ts   # Core normalization
│   │   ├── SimplifiedTerraformGeneratorService.ts  # HCL generation
│   │   ├── FileService.ts              # File persistence
│   │   ├── ModuleRegistryService.ts    # Module discovery
│   │   └── TerraformExecutionService.ts  # terraform plan/apply
│   ├── models/
│   │   └── Architecture.ts             # Type definitions
│   └── data/
│       └── terraform-modules/          # Terraform module templates
│           ├── networking/
│           │   ├── vpc/
│           │   ├── subnet/
│           │   ├── internet-gateway/
│           │   ├── nat-gateway/
│           │   └── route-table/
│           ├── compute/
│           │   └── ec2/
│           ├── security/
│           │   └── security-group/
│           ├── storage/
│           │   └── s3/
│           └── database/
│               └── rds/
└── docs/
    └── ARCHITECTURE_TO_TERRAFORM_FLOW.md  # This document
```

---

## 7. Key Design Decisions

### 7.1 Single-Pass Normalization
Instead of multiple transformation steps, resources are normalized in a single pass through `ArchitectureNormalizerService`.

### 7.2 Pre-Computed Module References
Module references are computed once in `buildModuleReferenceMap()` and reused during cross-reference resolution.

### 7.3 Node ID Pattern
Node IDs follow the pattern `aws-{resource-type}-{unique-id}` (e.g., `aws-vpc-lxys3o`). The regex `/^aws-[a-z0-9-]+-[a-z0-9]+$/i` detects these for resolution.

### 7.4 Smart Dependency Detection
- Parent-child relationships create implicit dependencies
- Connection direction is inferred based on resource types
- RouteTable depends on Gateway, EC2 depends on SecurityGroup, etc.

### 7.5 Conditional Resource Configuration
- Subnet's internal route table is disabled when separate RouteTable exists
- RouteTable routes are auto-populated with gateway references
- EC2 instances are auto-associated with available security groups

---

## 8. API Reference

### Generate Terraform

```
POST /api/terraform/generate

Request:
{
  "architectureData": { ... },
  "projectName": "my-infrastructure"
}

Response:
{
  "success": true,
  "data": {
    "project": {
      "name": "my-infrastructure-version1",
      "path": "/path/to/output"
    },
    "files": {
      "generated": 5,
      "list": ["main.tf", "variables.tf", "outputs.tf", "terraform.tfvars", "providers.tf"]
    }
  }
}
```

### Run Terraform Plan

```
POST /api/terraform/plan

Request:
{
  "architectureData": { ... },
  "projectName": "my-infrastructure"
}

Response:
{
  "success": true,
  "data": {
    "jobId": "plan-123",
    "status": "started",
    "pollUrl": "/api/terraform/plan-status/plan-123"
  }
}
```

### Check Plan Status

```
GET /api/terraform/plan-status/:jobId

Response:
{
  "success": true,
  "data": {
    "status": "completed",
    "result": { ... },
    "logs": [...]
  }
}
```
