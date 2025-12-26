# Complete Execution Flow of /terraform/generate API Endpoint

## Overview

This document explains in minute detail the complete execution flow of the `/terraform/generate` API endpoint, showing how data is transformed at each step from incoming request to final Terraform files.

---

## PHASE 1: Route Definition & Request Handling

**File:** [src/routes/apiRoutes.ts:12-16](src/routes/apiRoutes.ts#L12-L16)

### Step 1.1: Request arrives at POST /terraform/generate

**Input Data Structure:**

```typescript
{
  architectureData: ArchitectureData,  // Frontend or backend format
  projectName?: string                 // Optional project name
}
```

### Step 1.2: Middleware execution

**Line 14:** `ValidationMiddleware.validateArchitectureData` executes first

---

## PHASE 2: Validation Middleware

**File:** [src/middleware/ValidationMiddleware.ts:9-45](src/middleware/ValidationMiddleware.ts#L9-L45)

### Step 2.1: Extract request body

**Line 23:** Calls `ValidationUtils.validateArchitectureData(architectureData)`

**File:** [src/utils/ValidationUtils.ts:20-86](src/utils/ValidationUtils.ts#L20-L86)

### Step 2.2: Validation checks

- **Lines 22-25:** Check if metadata exists and has required fields
- **Lines 28-37:** Check if resources is an array with elements
- **Lines 40-60:** Validate each resource has: `id`, `resource_type`, `name`, `configuration`
- **Lines 63-71:** Validate connections structure

**Returns:** `{ isValid: boolean, errors: string[] }`

### Data State After Validation

- **If valid:** Request proceeds to controller
- **If invalid:** Returns 400 error response with validation errors

---

## PHASE 3: Controller Entry Point

**File:** [src/controllers/TerraformController.ts:21-249](src/controllers/TerraformController.ts#L21-L249)

### Step 3.1: Extract and initialize request data

**Lines 28-34:** Destructure request body

```typescript
const { architectureData, projectName = "infrastructure" } = req.body
```

**Lines 36-43:** Log request details (project name, resource count, connection count)

**Line 45-55:** Check if architectureData exists, return 400 if not

### Step 3.2: Determine data format

**Line 59:** Call `isFrontendFormat(architectureData)`

#### Format Detection Logic (Lines 1462-1477)

Checks:
- Has metadata object
- Has resources array with elements
- Resources have `node_type` field with value "aws_service" or "aws_container"

**Returns:** boolean indicating if data is in frontend format

#### Data Branching

- **Frontend Format:** Proceeds to transformation (Line 61)
- **Backend Format:** Skips transformation (Line 104)

---

## PHASE 4: Frontend Transformation (If Frontend Format Detected)

**File:** [src/services/FrontendArchitectureTransformerService.ts:38-144](src/services/FrontendArchitectureTransformerService.ts#L38-L144)

### Step 4.1: Initialize transformation

**Lines 43-44:** Extract `frontendResources` and `frontendMetadata`

**Lines 46-57:** Log transformation start and sample resource structure

**Lines 64-66:** Initialize tracking arrays: warnings, errors, mappings

### Step 4.2: Transform Metadata (Lines 70-72)

**Transform Metadata Function (Lines 149-167)**

#### Data Transformation:

```typescript
// INPUT (Frontend Format - snake_case):
{
  name: "My Architecture",
  description: "Sample",
  provider: "aws",
  environment: "dev",
  project: "myapp"
}

// OUTPUT (Backend Format - camelCase):
{
  name: "My Architecture",
  description: "Sample",
  version: "1.0.0",
  createdAt: "2025-12-25T...",
  lastModified: "2025-12-25T...",
  provider: "aws",
  environment: "dev",
  project: "myapp",
  tags: {...}
}
```

### Step 4.3: Transform Resources (Lines 75-78)

**Transform Resources Function (Lines 172-319)**

#### Step 4.3.1: Filter resources by type

**Lines 186-191:** Separate into service vs container resources

```typescript
serviceResources = resources.filter(r => r.node_type === "aws_service")
containerResources = resources.filter(r => r.node_type === "aws_container")
```

#### Step 4.3.2: Create container mapping

**Lines 194-196:** Build `Map<string, FrontendResource>` for quick lookup

#### Step 4.3.3: Transform each service resource (Lines 198-268)

For Each Resource:

##### A. Map Resource Type (Lines 205-208)

**Function:** `mapResourceType()` (Lines 324-404)

**Transformation:**

```typescript
// INPUT: "aws-vpc" or "vpc"
// OUTPUT: { resourceType: "vpc", nodeType: "aws_service" }

// INPUT: "aws-ec2"
// OUTPUT: { resourceType: "ec2", nodeType: "aws_service" }
```

##### B. Transform Configuration (Lines 211-216)

**Function:** `transformNodeConfiguration()` (Lines 409-489)

**Configuration Transformation by Resource Type:**

###### VPC Configuration (Lines 494-506)

```typescript
// INPUT:
{
  cidr_block: "10.0.0.0/16",
  enable_dns_support: true
}

// MODIFICATIONS:
// - Sets enable_dns_support = true if undefined
// - Sets enable_dns_hostnames = false if undefined
// - Adds tags: { Name: "vpc-name", ResourceId: "vpc-id" }
```

###### Subnet Configuration (Lines 511-539)

```typescript
// INPUT:
{
  cidr_block: "10.0.1.0/24",
  availability_zone: "us-east-1a",
  parent_id: "vpc-123"
}

// MODIFICATIONS:
// - Determines subnet_type from resource_type (public/private)
// - Finds VPC via parent hierarchy if vpc_id not set
// - Sets vpc_id to parent VPC's ID
// - Adds tags

// OUTPUT:
{
  cidr_block: "10.0.1.0/24",
  availability_zone: "us-east-1a",
  subnet_type: "public",
  vpc_id: "vpc-123",
  tags: { Name: "subnet-name", ResourceId: "subnet-id" }
}
```

###### EC2 Configuration (Lines 544-581)

```typescript
// INPUT:
{
  instance_type: "t3.micro",
  ami_id: "ami-12345678",
  parent_id: "subnet-456"
}

// MODIFICATIONS:
// - Sets default root_block_device if not present:
//   {
//     volume_size: 8,
//     volume_type: "gp3",
//     delete_on_termination: true,
//     encrypted: false
//   }
// - Initializes ebs_block_device = []
// - Initializes security_group_ids = []
// - Finds subnet reference from parent if subnet_id not set
// - Adds tags

// OUTPUT:
{
  instance_type: "t3.micro",
  ami_id: "ami-12345678",
  subnet_id: "subnet-456",
  root_block_device: { ... },
  ebs_block_device: [],
  security_group_ids: [],
  tags: { Name: "ec2-name", ResourceId: "ec2-id" }
}
```

###### Security Group Configuration (Lines 586-605)

```typescript
// MODIFICATIONS:
// - Sets default description if missing
// - Ensures ingress_rules = []
// - Ensures egress_rules = []
// - Adds tags
```

###### Route Table Configuration (Lines 662-690)

```typescript
// INPUT:
{
  routes: [ ... ],  // Array format
  associations: [ ... ]  // Array format
}

// MODIFICATIONS:
// - Converts routes array to map/object format
// - Converts associations array to map format
// - Each association gets unique key

// OUTPUT:
{
  routes: {
    "route_igw": { destination: "0.0.0.0/0", gateway_id: "..." },
    "route_nat": { destination: "0.0.0.0/0", nat_gateway_id: "..." }
  },
  associations: {
    "subnet_123": { subnet_id: "subnet-123" }
  },
  tags: { ... }
}
```

##### C. Determine Parent Relationship (Lines 219-239)

- Only sets parent for EC2 instances within subnets
- Avoids circular dependencies for other resources

##### D. Build Transformed Resource (Lines 241-248)

```typescript
{
  id: frontendResource.id,
  resource_type: "vpc",  // Normalized type
  name: frontendResource.name || frontendResource.id,
  configuration: { ...transformedConfig },
  parent_id: actualParent  // Only for EC2 in subnets
}
```

##### E. Record Mapping (Lines 252-257)

```typescript
{
  frontendId: "vpc-123",
  backendId: "vpc-123",
  resourceType: "vpc",
  transformations: ["Kept subnet parent for EC2 instance"]
}
```

#### Step 4.3.4: Convert container resources to services (Lines 270-312)

For VPCs, Subnets, Security Groups that were containers:
- Applies same transformation logic

### Step 4.4: Transform Connections (Lines 81-87)

**Transform Connections Function (Lines 767-839)**

For Each Connection:

```typescript
// INPUT:
{
  id: "conn-1",
  source: "vpc-123",
  target: "subnet-456",
  sourceHandle: "bottom",
  targetHandle: "top",
  type: "contains"
}

// VALIDATION:
// - Checks if source exists in transformed resources
// - Checks if target exists in transformed resources
// - Skips connection if either doesn't exist

// OUTPUT:
{
  id: "conn-1",
  source: "vpc-123",
  target: "subnet-456",
  sourceHandle: "bottom",
  targetHandle: "top",
  type: "contains"
}
```

#### Implicit Connections Added (Lines 819-833)

For each resource with parent_id, adds connection:

```typescript
{
  id: "implicit-{childId}-{parentId}",
  source: parentId,
  target: childId,
  type: "contains"
}
```

### Step 4.5: Build Transformation Result (Lines 89-95)

```typescript
{
  transformed: {
    metadata: { ... },
    resources: [ ...transformedResources ],
    connections: [ ...transformedConnections ],
    variables: frontendData.variables || {},
    outputs: frontendData.outputs || {}
  },
  warnings: [ "..." ],
  errors: [],
  mappings: [ ... ]
}
```

### Step 4.6: Controller receives transformed data

**Line 97:** `processedArchitectureData = transformationResult.transformed`

---

## PHASE 5: Architecture Parsing

**File:** [src/controllers/TerraformController.ts:113-115](src/controllers/TerraformController.ts#L113-L115)

Calls `ArchitectureParserService.parseArchitecture(processedArchitectureData)`

**File:** [src/services/ArchitectureParserService.ts:69-104](src/services/ArchitectureParserService.ts#L69-L104)

### Step 5.1: Parse Nodes (Line 77)

**Parse Nodes Function (Lines 109-126)**

For Each Resource:

```typescript
// INPUT (from transformed/backend data):
{
  id: "vpc-123",
  resource_type: "vpc",
  name: "main-vpc",
  configuration: { cidr_block: "10.0.0.0/16", ... },
  parent_id: undefined
}

// PROCESSING:
// 1. Map resource type to Terraform module (Lines 111)
//    - Calls mapResourceTypeToModule("vpc")
//    - Returns "networking/vpc" (Lines 164-217)
//
// 2. Normalize configuration (Line 117)
//    - Converts string booleans to actual booleans
//    - Ensures tags exist
//
// 3. Find children (Line 121)
//    - Filters all nodes where parent_id === current node id

// OUTPUT (ParsedNode):
{
  id: "vpc-123",
  name: "main-vpc",
  resourceType: "vpc",
  configuration: { cidr_block: "10.0.0.0/16", tags: {...}, ... },
  position: { x: 0, y: 0 },
  dimensions: { width: 100, height: 50 },
  parentId: undefined,
  children: ["subnet-456", "subnet-789"],
  dependencies: [],  // Will be populated next
  terraformModule: "networking/vpc"
}
```

### Step 5.2: Parse Connections (Lines 78-80)

```typescript
// INPUT:
{
  id: "conn-1",
  source: "vpc-123",
  target: "subnet-456"
}

// OUTPUT (ParsedConnection):
{
  id: "conn-1",
  sourceId: "vpc-123",
  targetId: "subnet-456",
  connectionType: "contains",
  configuration: {}
}
```

### Step 5.3: Parse Metadata (Lines 81)

```typescript
// INPUT:
{
  provider: "aws",
  region: "us-east-1",
  environment: "dev",
  project: "myapp"
}

// OUTPUT (ParsedArchitectureMetadata):
{
  provider: "aws",
  region: "us-east-1",
  environment: "dev",
  project: "myapp",
  version: "1.0.0",
  tags: {
    Environment: "dev",
    Project: "myapp",
    ManagedBy: "Darch",
    CreatedAt: "2025-12-25T..."
  }
}
```

### Step 5.4: Build Dependency Graph (Line 84)

**Build Dependency Graph Function (Lines 244-295)**

#### Step 5.4.1: Add parent dependencies (Lines 251-255)

```typescript
// For each node with parentId:
if (node.parentId && parentExists) {
  node.dependencies.push(node.parentId)
}

// Example: subnet-456 depends on vpc-123
subnet.dependencies = ["vpc-123"]
```

#### Step 5.4.2: Add connection-based dependencies (Lines 258-291)

**Determine Connection Direction (Lines 301-333):**

```typescript
// RULE 1: Route Table → IGW/NAT
// Route table depends on gateway
if (source.terraformModule === 'networking/route-table' &&
    target.terraformModule === 'networking/internet-gateway') {
  sourceNode.dependencies.push(targetId)  // RT depends on IGW
}

// RULE 2: Route Table → Subnet
// Route table depends on subnet (for associations)
if (source.terraformModule === 'networking/route-table' &&
    target.terraformModule === 'networking/subnet') {
  sourceNode.dependencies.push(targetId)  // RT depends on Subnet
}

// RULE 3: EC2 → Security Group
// EC2 depends on security group
if (source.terraformModule === 'compute/ec2' &&
    target.terraformModule === 'security/security-group') {
  sourceNode.dependencies.push(targetId)  // EC2 depends on SG
}

// DEFAULT: Target depends on source
targetNode.dependencies.push(sourceId)
```

#### Step 5.4.3: Add implicit dependencies (Lines 294)

**Add Implicit Dependencies Function (Lines 339-458)**

For Each Resource Type:

##### A. Subnet (Lines 344-352)

```typescript
if (!node.configuration.vpc_id) {
  // Find any VPC in the architecture
  const vpc = nodes.find(n => n.terraformModule === "networking/vpc")
  if (vpc && !node.dependencies.includes(vpc.id)) {
    node.dependencies.push(vpc.id)
  }
}
// subnet.dependencies = ["vpc-123"]
```

##### B. Internet Gateway (Lines 354-364)

```typescript
if (!node.configuration.vpc_id) {
  const vpc = nodes.find(n => n.terraformModule === "networking/vpc")
  igw.dependencies.push(vpc.id)
}
// igw.dependencies = ["vpc-123"]
```

##### C. NAT Gateway (Lines 366-377)

```typescript
if (!node.configuration.subnet_id) {
  // Find a public subnet
  const publicSubnet = nodes.find(n =>
    n.terraformModule === "networking/subnet" &&
    n.configuration.map_public_ip_on_launch === true
  )
  nat.dependencies.push(publicSubnet.id)
}
// nat.dependencies = ["subnet-public-456"]
```

##### D. Route Table (Lines 379-421)

```typescript
// Add VPC dependency
if (!node.configuration.vpc_id) {
  rt.dependencies.push(vpcId)
}

// Parse routes and add gateway dependencies
if (node.configuration.routes) {
  Object.values(routes).forEach(route => {
    if (route.gateway_id) {
      // Find IGW by name or ID
      const igw = nodes.find(n =>
        n.terraformModule === "networking/internet-gateway" &&
        (n.configuration.name === route.gateway_id || n.id === route.gateway_id)
      )
      rt.dependencies.push(igw.id)
    }
    if (route.nat_gateway_id) {
      // Find NAT by name or ID
      rt.dependencies.push(nat.id)
    }
  })
}
// rt.dependencies = ["vpc-123", "igw-789", "nat-101"]
```

##### E. EC2 (Lines 423-443)

```typescript
if (!node.configuration.subnet_id) {
  const subnet = nodes.find(n => n.terraformModule === "networking/subnet")
  ec2.dependencies.push(subnet.id)
}
if (!node.configuration.security_group_ids || length === 0) {
  const sg = nodes.find(n => n.terraformModule === "security/security-group")
  ec2.dependencies.push(sg.id)
}
// ec2.dependencies = ["subnet-456", "sg-999"]
```

##### F. Security Group (Lines 445-455)

```typescript
if (!node.configuration.vpc_id) {
  sg.dependencies.push(vpcId)
}
// sg.dependencies = ["vpc-123"]
```

### Step 5.5: Validate Architecture (Lines 87-91)

**Validate Architecture Function (Lines 463-514)**

#### Validation 1: Individual Nodes (Lines 472-483)

For each node, calls `validateNode()` (Lines 519-557)

Checks required fields based on module type:
- **VPC:** `cidr_block`
- **Subnet:** `cidr_block`, `availability_zone`
- **IGW:** `vpc_id`
- **EC2:** `instance_type`
- **Security Group:** `name`
- **S3:** `bucket_name`

Validates CIDR format (Lines 579-611):
- Checks for CIDR overlaps
- For security groups, checks for overly permissive rules

#### Validation 2: Dependencies (Lines 486-493)

- Checks for circular dependencies using cycle detection (Lines 641-678)
- Uses recursion stack to detect cycles in dependency graph

#### Validation 3: Connections (Lines 496-503)

- Validates source and target nodes exist (Lines 683-709)

#### Validation 4: Architecture Patterns (Lines 506-507)

- Checks for missing VPC when networking resources exist
- Warns if EC2 instances without security groups

### Returns ParsedArchitecture

```typescript
{
  nodes: [
    {
      id: "vpc-123",
      name: "main-vpc",
      resourceType: "vpc",
      configuration: { ... },
      position: { x: 0, y: 0 },
      dimensions: { width: 100, height: 50 },
      parentId: undefined,
      children: ["subnet-456"],
      dependencies: [],
      terraformModule: "networking/vpc"
    },
    {
      id: "subnet-456",
      name: "public-subnet",
      resourceType: "subnet",
      configuration: { vpc_id: "vpc-123", ... },
      dependencies: ["vpc-123"],
      terraformModule: "networking/subnet"
    }
  ],
  connections: [ ... ],
  metadata: { provider: "aws", region: "us-east-1", ... },
  validation: {
    valid: true,
    errors: [],
    warnings: []
  }
}
```

---

## PHASE 6: Module Mapping

**File:** [src/controllers/TerraformController.ts:142-144](src/controllers/TerraformController.ts#L142-L144)

Calls `ModuleMapperService.mapArchitectureToModules(parsedArchitecture)`

**File:** [src/services/ModuleMapperService.ts:33-103](src/services/ModuleMapperService.ts#L33-L103)

### Step 6.1: Topological Sort (Line 50)

**Topological Sort Function (Lines 583-623)**

```typescript
// PURPOSE: Sort nodes by dependency order to prevent circular references
// ALGORITHM: Kahn's algorithm for topological sorting

// INPUT: nodes with dependencies
[
  { id: "ec2-1", dependencies: ["subnet-456", "sg-999"] },
  { id: "subnet-456", dependencies: ["vpc-123"] },
  { id: "sg-999", dependencies: ["vpc-123"] },
  { id: "vpc-123", dependencies: [] }
]

// OUTPUT: sorted nodes (dependencies first)
[
  { id: "vpc-123", dependencies: [] },        // Level 0
  { id: "subnet-456", dependencies: [...] },  // Level 1
  { id: "sg-999", dependencies: [...] },      // Level 1
  { id: "ec2-1", dependencies: [...] }        // Level 2
]
```

### Step 6.2: Map Each Node to Module (Lines 53-70)

**Map Node to Module Function (Lines 108-141)**

For Each Sorted Node:

#### 1. Split Module Path (Line 113)

```typescript
const [category, moduleName] = "networking/vpc".split('/')
// category = "networking"
// moduleName = "vpc"
```

#### 2. Get Module Definition from Registry (Lines 116-119)

```typescript
const moduleDefinition = await ModuleRegistryService.getModule("networking", "vpc")
// Returns module metadata with variables, outputs, etc.
```

#### 3. Generate Module Instance Name (Line 122)

**Generate Module Instance Name Function (Lines 146-159)**

```typescript
// INPUT: node.name = "Main VPC" or node.id = "vpc-abc123def"

// PROCESSING:
const baseName = node.name || node.id  // "Main VPC"
const sanitized = baseName
  .toLowerCase()              // "main vpc"
  .replace(/[^a-z0-9]/g, '_') // "main_vpc"
  .replace(/_{2,}/g, '_')     // "main_vpc"
  .replace(/^_+|_+$/g, '')    // "main_vpc"

const hash = node.id.slice(-6)  // "23def"

// OUTPUT:
return "main_vpc_23def"
```

#### 4. Map Configuration to Variables (Lines 125-130)

**Map Configuration to Variables Function (Lines 164-190)**

Variable Mapping Examples:

##### A. Direct Mapping (Lines 208-210)

```typescript
// If config has the variable and it's not a cross-module reference:
if (config.cidr_block !== undefined && !crossModuleReferenceVars.includes('cidr_block')) {
  variables.cidr_block = config.cidr_block  // "10.0.0.0/16"
}
```

##### B. Common Variables (Lines 213-291)

```typescript
switch (varName) {
  case 'name':
    return node.name  // "main-vpc"

  case 'region':
    return metadata.region  // "us-east-1"

  case 'availability_zone':
    return config.availability_zone || `${metadata.region}a`  // "us-east-1a"

  case 'cidr_block':
    return config.cidr_block || this.generateDefaultCidr(node)  // "10.0.0.0/16"

  case 'vpc_id':
    // IMPORTANT: Returns placeholder for later resolution
    return '__MODULE_REF__vpc_id'

  case 'subnet_id':
    return '__MODULE_REF__subnet_id'

  case 'security_group_ids':
    return ['__MODULE_REF__security_group_ids']

  case 'instance_type':
    return config.instance_type || 't3.micro'

  case 'ami_id':
    const amiId = config.ami_id
    if (!amiId || amiId === '' || amiId === 'latest') {
      return null  // Use data source for latest AMI
    }
    // Validate AMI ID format: ami-[8 or 17 hex chars]
    if (/^ami-[0-9a-f]{8}$|^ami-[0-9a-f]{17}$/.test(amiId)) {
      return amiId  // "ami-12345678"
    }
    return null  // Invalid format, use data source

  case 'bucket_name':
    return config.bucket_name || generateUniqueBucketName(node.name)

  case 'subnet_type':
    // Infer from resource type or configuration
    return 'public' or 'private'

  case 'routes':
    // For route tables: return empty map (will be filled later)
    return {}

  case 'associations':
    // For route tables: return empty map (will be filled later)
    return {}
}
```

##### C. Add Common Tags (Lines 181-188)

```typescript
variables.tags = {
  ...metadata.tags,           // { Environment: "dev", Project: "myapp", ManagedBy: "Darch" }
  Name: node.name,            // "main-vpc"
  ResourceType: node.resourceType,  // "vpc"
  NodeId: node.id,            // "vpc-123"
  ...node.configuration.tags  // User-defined tags
}
```

#### 5. Create Module Source Path (Line 133)

```typescript
const modulePath = `../../../../data/terraform-modules/${category}/${moduleName}`
// Result: "../../../../data/terraform-modules/networking/vpc"
```

#### 6. Generate Module Outputs (Line 139)

```typescript
// Based on module definition outputs
outputs: {
  vpc_id: "module.main_vpc_23def.vpc_id",
  vpc_arn: "module.main_vpc_23def.vpc_arn",
  cidr_block: "module.main_vpc_23def.cidr_block"
}
```

#### 7. Return Generated Module (Lines 135-140)

```typescript
{
  name: "main_vpc_23def",
  source: "../../../../data/terraform-modules/networking/vpc",
  variables: {
    name: "main-vpc",
    cidr_block: "10.0.0.0/16",
    enable_dns_support: true,
    enable_dns_hostnames: false,
    tags: {
      Environment: "dev",
      Project: "myapp",
      Name: "main-vpc",
      ResourceType: "vpc",
      NodeId: "vpc-123"
    }
  },
  outputs: { vpc_id: "module.main_vpc_23def.vpc_id", ... }
}
```

### Step 6.3: Build Module Dependencies (Lines 73-74)

**Build Module Dependencies Function (Lines 527-553)**

```typescript
// For each module, map node dependencies to module dependencies

// INPUT: node with dependencies
{
  id: "ec2-1",
  dependencies: ["subnet-456", "sg-999"]
}

// Find corresponding modules for each dependency:
const subnetModule = modules.find(m => m corresponds to subnet-456)
const sgModule = modules.find(m => m corresponds to sg-999)

// OUTPUT: ModuleDependency
{
  moduleId: "ec2_instance_abc123",
  dependsOn: ["public_subnet_456def", "web_sg_999xyz"],
  level: 2  // Calculated based on dependency depth
}
```

#### Calculate Dependency Levels (Lines 558-578)

```
// Level 0: No dependencies (VPC)
// Level 1: Depends on level 0 (Subnet, IGW, SG)
// Level 2: Depends on level 1 (EC2, Route Table)
```

### Returns ModuleMappingResult

```typescript
{
  modules: [
    {
      name: "main_vpc_23def",
      source: "../../../../data/terraform-modules/networking/vpc",
      variables: { ... },
      outputs: { ... }
    },
    {
      name: "public_subnet_456def",
      source: "../../../../data/terraform-modules/networking/subnet",
      variables: {
        name: "public-subnet",
        cidr_block: "10.0.1.0/24",
        availability_zone: "us-east-1a",
        vpc_id: "__MODULE_REF__vpc_id",  // PLACEHOLDER
        subnet_type: "public",
        tags: { ... }
      },
      outputs: { ... }
    }
  ],
  dependencies: [
    {
      moduleId: "public_subnet_456def",
      dependsOn: ["main_vpc_23def"],
      level: 1
    }
  ],
  errors: [],
  warnings: [],
  nodes: [ ...originalParsedNodes ]
}
```

---

## PHASE 7: Terraform Code Generation

**File:** [src/controllers/TerraformController.ts:169-174](src/controllers/TerraformController.ts#L169-L174)

Calls `ModularTerraformGeneratorService.generateTerraformConfiguration(mappingResult, metadata, projectName)`

**File:** [src/services/ModularTerraformGeneratorService.ts:26-90](src/services/ModularTerraformGeneratorService.ts#L26-L90)

### Step 7.1: Generate main.tf (Line 40)

**Generate Main.tf Function (Lines 95-123)**

#### Step 7.1.1: Sort modules by dependency level (Lines 103-108)

```typescript
// Ensures VPC is first, then subnets/IGW/SG, then EC2
sortedModules = [
  { name: "main_vpc_23def", level: 0 },
  { name: "public_subnet_456def", level: 1 },
  { name: "ec2_instance_abc123", level: 2 }
]
```

#### Step 7.1.2: Generate file header (Line 110)

```hcl
# Main Terraform configuration
# Generated by Darch
# Date: 2025-12-25T...
```

#### Step 7.1.3: Generate locals block (Line 113)

**Generate Locals Block Function (Lines 128-142)**

```hcl
locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    CreatedBy   = "Darch"
    Region      = var.aws_region
  }

  name_prefix = "${var.project_name}-${var.environment}"
}
```

#### Step 7.1.4: Generate module blocks (Lines 117-120)

**Generate Module Block Function (Lines 147-230)**

For Each Module:

##### 1. Start Module Block (Lines 153-154)

```hcl
module "main_vpc_23def" {
  source = "../../../../data/terraform-modules/networking/vpc"
```

##### 2. Process Variables (Lines 157-216)

###### A. Resolve Cross-Module References

**Resolve Cross-Module Reference Function (Lines 235-625)**

For `vpc_id` Placeholder (Lines 261-330):

```typescript
// STEP 1: Find current node for this module
const currentNode = nodes.find(node => {
  const moduleName = generateModuleName(node)  // "public_subnet_456def"
  return moduleName === currentModule.name
})

// STEP 2: Find VPC for this node
const vpcNode = findVpcForNode(currentNode, nodes)

// STRATEGY 1: Traverse parent hierarchy
let current = currentNode
while (current.parentId) {
  const parent = nodes.find(n => n.id === current.parentId)
  if (parent.resourceType.includes('vpc')) {
    vpcNode = parent  // Found!
    break
  }
  current = parent
}

// STRATEGY 2: Check configuration reference
if (!vpcNode) {
  const vpcId = currentNode.configuration.vpc_id
  vpcNode = nodes.find(n => n.id === vpcId)
}

// STRATEGY 3: Fallback to any VPC
if (!vpcNode) {
  vpcNode = nodes.find(n => n.resourceType === 'vpc')
}

// STEP 3: Generate module reference
if (vpcNode) {
  const vpcModuleName = generateModuleName(vpcNode)  // "main_vpc_23def"
  return `module.${vpcModuleName}.vpc_id`
  // Result: "module.main_vpc_23def.vpc_id"
}
```

For `subnet_id` Placeholder:
- Similar strategy: hierarchy → config → fallback

For `security_group_ids` Placeholder:
- Returns array of module references
- Example: `["module.web_sg_999xyz.security_group_id"]`

For `internet_gateway_id` Placeholder (Lines 332-385):

```typescript
// Find IGW via:
// 1. Configuration reference
// 2. VPC's attached IGW
// 3. Fallback to any IGW
return "module.main_igw_789abc.internet_gateway_id"
```

For `nat_gateway_id` Placeholder:
- Similar to IGW resolution

###### B. Resolve Map Placeholders (Lines 196-198)

**Resolve Map Placeholders Function (Lines 631-697)**

For Route Table routes and associations:

```typescript
// INPUT (before resolution):
{
  routes: {
    "route_igw": {
      destination: "0.0.0.0/0",
      gateway_id: "__PLACEHOLDER__igw-789"
    }
  },
  associations: {
    "assoc_subnet": {
      subnet_id: "__PLACEHOLDER__subnet-456"
    }
  }
}

// PROCESSING:
for (const [key, value] of Object.entries(map)) {
  if (typeof value === 'object') {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      if (typeof nestedValue === 'string' && nestedValue.includes('__PLACEHOLDER__')) {
        // Find the referenced node
        const refId = nestedValue.replace('__PLACEHOLDER__', '')
        const refNode = nodes.find(n => n.id === refId)

        // Generate module reference
        const refModuleName = generateModuleName(refNode)

        if (nestedKey === 'gateway_id') {
          value[nestedKey] = `module.${refModuleName}.internet_gateway_id`
        } else if (nestedKey === 'subnet_id') {
          value[nestedKey] = `module.${refModuleName}.subnet_id`
        }
      }
    }
  }
}

// OUTPUT (after resolution):
{
  routes: {
    "route_igw": {
      destination: "0.0.0.0/0",
      gateway_id: "module.main_igw_789abc.internet_gateway_id"
    }
  },
  associations: {
    "assoc_subnet": {
      subnet_id: "module.public_subnet_456def.subnet_id"
    }
  }
}
```

##### 3. Format Terraform Values (Lines 213-215)

**Format Terraform Value Function (Lines 972-1006)**

```typescript
// String
formatTerraformValue("hello")
// Output: "\"hello\""

// Number
formatTerraformValue(42)
// Output: "42"

// Boolean
formatTerraformValue(true)
// Output: "true"

// Array
formatTerraformValue(["a", "b"])
// Output: "[\"a\", \"b\"]"

// Object/Map
formatTerraformValue({ key1: "value1", key2: 42 })
// Output:
// {
//   key1 = "value1"
//   key2 = 42
// }

// Module Reference (string containing "module.")
formatTerraformValue("module.main_vpc_23def.vpc_id")
// Output: "module.main_vpc_23def.vpc_id" (no quotes)

// Variable Reference (string containing "var.")
formatTerraformValue("var.aws_region")
// Output: "var.aws_region" (no quotes)
```

##### 4. Add Variable to Block (Line 215)

```hcl
  vpc_id               = module.main_vpc_23def.vpc_id
  cidr_block           = "10.0.1.0/24"
  availability_zone    = "us-east-1a"
  subnet_type          = "public"
  tags                 = {
    Environment = "dev"
    Name        = "public-subnet"
    NodeId      = "subnet-456"
    Project     = "myapp"
    ResourceType = "subnet"
  }
```

##### 5. Add depends_on (Lines 219-226)

```hcl
  depends_on = [
    module.main_vpc_23def,
  ]
}
```

##### Complete Module Block Example

```hcl
module "public_subnet_456def" {
  source = "../../../../data/terraform-modules/networking/subnet"

  availability_zone    = "us-east-1a"
  cidr_block           = "10.0.1.0/24"
  name                 = "public-subnet"
  subnet_type          = "public"
  tags                 = {
    Environment = "dev"
    ManagedBy   = "Darch"
    Name        = "public-subnet"
    NodeId      = "subnet-456"
    Project     = "myapp"
    ResourceType = "subnet"
  }
  vpc_id               = module.main_vpc_23def.vpc_id

  depends_on = [
    module.main_vpc_23def,
  ]
}
```

### Step 7.2: Generate variables.tf (Line 41)

**Generate Variables.tf Function (Lines 746-796)**

```hcl
# Input variables for the Terraform configuration

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "development"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "infrastructure"
}

# Module-specific variables extracted from modules
# (Lines 891-905: Extract unique variables from all modules)
```

### Step 7.3: Generate outputs.tf (Line 42)

**Generate Outputs.tf Function (Lines 801-821)**

```hcl
# Output values from the Terraform configuration

output "main_vpc_23def_vpc_id" {
  description = "VPC ID from main_vpc_23def"
  value       = module.main_vpc_23def.vpc_id
}

output "main_vpc_23def_vpc_arn" {
  description = "VPC ARN from main_vpc_23def"
  value       = module.main_vpc_23def.vpc_arn
}

output "public_subnet_456def_subnet_id" {
  description = "Subnet ID from public_subnet_456def"
  value       = module.public_subnet_456def.subnet_id
}

# ... (one output for each module output)
```

### Step 7.4: Generate terraform.tfvars (Line 43)

**Generate Terraform.tfvars Function (Lines 826-849)**

```hcl
# Variable values for the Terraform configuration

aws_region   = "us-east-1"
environment  = "dev"
project_name = "myapp"
```

### Step 7.5: Generate providers.tf (Line 44)

**Generate Providers.tf Function (Lines 854-886)**

```hcl
# Provider and version constraints

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}
```

### Returns TerraformGenerationResult

```typescript
{
  mainTf: "# Main Terraform configuration\n\nlocals {...}\n\nmodule \"main_vpc_23def\" {...}\n...",
  variablesTf: "variable \"aws_region\" {...}\n...",
  outputsTf: "output \"main_vpc_23def_vpc_id\" {...}\n...",
  terraformTfvars: "aws_region = \"us-east-1\"\n...",
  providersVersionsTf: "terraform {...}\n\nprovider \"aws\" {...}",
  files: [
    { filename: "main.tf", content: "...", description: "..." },
    { filename: "variables.tf", content: "...", description: "..." },
    // ...
  ]
}
```

---

## PHASE 8: File Persistence

**File:** [src/controllers/TerraformController.ts:185-188](src/controllers/TerraformController.ts#L185-L188)

Calls `FileService.saveGeneratedTerraformFiles(terraformResult, projectName)`

**File:** [src/services/FileService.ts:105-149](src/services/FileService.ts#L105-L149)

### Step 8.1: Create Versioned Project Name (Lines 324-342)

```typescript
// INPUT: projectName = "myapp"

// STEP 1: Check existing versions
const baseDir = path.join(process.cwd(), 'generated/terraform')
const existingDirs = await fs.readdir(baseDir)

// existingDirs = ["myapp-version1", "myapp-version2"]

// STEP 2: Extract version numbers
const versionNumbers = existingDirs
  .filter(dir => dir.startsWith('myapp-version'))
  .map(dir => parseInt(dir.replace('myapp-version', '')))

// versionNumbers = [1, 2]

// STEP 3: Calculate next version
const nextVersion = Math.max(...versionNumbers, 0) + 1  // 3

// OUTPUT: projectId = "myapp-version3"
```

### Step 8.2: Create Directory Structure

```typescript
// Create directory
const projectDir = path.join(baseDir, projectId)
await fs.mkdir(projectDir, { recursive: true })

// Path: /home/user/project/generated/terraform/myapp-version3
```

### Step 8.3: Save Each File (Lines 131-134)

```typescript
for (const file of terraformResult.files) {
  const filePath = path.join(projectDir, file.filename)
  await fs.writeFile(filePath, file.content, 'utf-8')
}

// Files created:
// - /home/user/project/generated/terraform/myapp-version3/main.tf
// - /home/user/project/generated/terraform/myapp-version3/variables.tf
// - /home/user/project/generated/terraform/myapp-version3/outputs.tf
// - /home/user/project/generated/terraform/myapp-version3/terraform.tfvars
// - /home/user/project/generated/terraform/myapp-version3/providers.tf
```

### Returns

```typescript
{
  projectDir: "/home/user/project/generated/terraform/myapp-version3",
  files: [
    { name: "main.tf", path: ".../main.tf", size: 1234 },
    { name: "variables.tf", path: ".../variables.tf", size: 567 },
    // ...
  ]
}
```

---

## PHASE 9: Validation

**File:** [src/controllers/TerraformController.ts:191-194](src/controllers/TerraformController.ts#L191-L194)

Calls `ModularTerraformGeneratorService.validateTerraformSyntax(terraformResult.mainTf)`

**File:** [src/services/ModularTerraformGeneratorService.ts:1029-1054](src/services/ModularTerraformGeneratorService.ts#L1029-L1054)

### Validation Checks

#### 1. Brace Matching (Lines 1059-1067)

```typescript
const openBraces = (content.match(/{/g) || []).length
const closeBraces = (content.match(/}/g) || []).length

if (openBraces !== closeBraces) {
  errors.push(`Mismatched braces: ${openBraces} opening, ${closeBraces} closing`)
}
```

#### 2. Quote Matching (Lines 1072-1093)

```typescript
let inString = false
let escapeNext = false

for (const char of content) {
  if (char === '\\' && !escapeNext) {
    escapeNext = true
  } else if (char === '"' && !escapeNext) {
    inString = !inString
  } else {
    escapeNext = false
  }
}

if (inString) {
  errors.push('Unclosed string literal')
}
```

#### 3. Required Blocks (Lines 1095-1110)

```typescript
if (!content.includes('module "')) {
  errors.push('No module blocks found')
}
```

### Returns

```typescript
{
  valid: true,
  errors: [],
  warnings: []
}
```

---

## PHASE 10: Response Construction

**File:** [src/controllers/TerraformController.ts:196-226](src/controllers/TerraformController.ts#L196-L226)

### Build Response Object

```typescript
{
  project: {
    name: "myapp",
    path: "/home/user/project/generated/terraform/myapp-version3",
    generatedAt: "2025-12-25T10:30:00.000Z"
  },
  files: {
    generated: 5,
    list: [
      { name: "main.tf", path: "...", size: 1234 },
      { name: "variables.tf", path: "...", size: 567 },
      { name: "outputs.tf", path: "...", size: 890 },
      { name: "terraform.tfvars", path: "...", size: 123 },
      { name: "providers.tf", path: "...", size: 456 }
    ]
  },
  validation: {
    syntaxValid: true,
    errors: []
  },
  architectureValidation: {
    valid: true,
    errorCount: 0,
    warningCount: 0
  },
  moduleMapping: {
    modulesGenerated: 3,
    dependencies: 2,
    warnings: []
  },
  status: "success"
}
```

### Format with ResponseView

```typescript
ResponseView.success(data, "Modular Terraform configuration generated successfully")
```

### Send Response (Line 226)

```typescript
res.json(response)
```

---

## Complete Data Flow Summary

```
1. HTTP Request
   ↓
2. Validation Middleware
   → Validates structure
   ↓
3. Controller Entry
   → Extracts data
   → Detects format
   ↓
4. Frontend Transformation (if needed)
   → Transforms metadata (snake_case → camelCase)
   → Transforms resources (filters, maps types, transforms configs)
   → Transforms connections (validates, adds implicit)
   ↓
5. Architecture Parsing
   → Parses nodes (maps to modules, normalizes config)
   → Parses connections
   → Parses metadata
   → Builds dependencies (parent, connection, implicit)
   → Validates (nodes, dependencies, connections, patterns)
   ↓
6. Module Mapping
   → Topological sort (dependency order)
   → Maps each node to module
     - Generates instance name
     - Maps variables (with placeholders for cross-refs)
     - Creates module definition
   → Builds module dependencies
   ↓
7. Terraform Generation
   → Generates main.tf
     - Locals block
     - Module blocks (resolves cross-refs, formats values)
   → Generates variables.tf
   → Generates outputs.tf
   → Generates terraform.tfvars
   → Generates providers.tf
   ↓
8. File Persistence
   → Creates versioned directory
   → Writes all .tf files
   ↓
9. Validation
   → Validates Terraform syntax
   ↓
10. Response
    → Constructs success response
    → Returns to client
```

---

## Key Data Transformations

### 1. Field Name Normalization

```
Frontend → Backend:
- node_type → (removed, implicit)
- resource_type → resource_type (normalized value)
- parent_id → parent_id
```

### 2. Resource Type Mapping

```
"aws-vpc" → "vpc" → "networking/vpc"
"aws-subnet" → "subnet" → "networking/subnet"
"aws-ec2" → "ec2" → "compute/ec2"
```

### 3. Configuration Enhancement

```
VPC: + enable_dns_support, enable_dns_hostnames, tags
Subnet: + subnet_type, vpc_id (from parent), tags
EC2: + root_block_device, ebs_block_device, security_group_ids, subnet_id, tags
Route Table: routes array → map, associations array → map
```

### 4. Dependency Resolution

```
Parent-Child → dependencies array
Connections → dependencies array (with direction logic)
Implicit → dependencies array (based on AWS rules)
```

### 5. Module Instance Naming

```
Node Name "Main VPC" + Node ID "vpc-abc123def"
→ Sanitize: "main_vpc"
→ Add Hash: "main_vpc_23def"
```

### 6. Cross-Module Reference Resolution

```
Placeholder: "__MODULE_REF__vpc_id"
→ Find VPC node via hierarchy/config/fallback
→ Generate module name: "main_vpc_23def"
→ Reference: "module.main_vpc_23def.vpc_id"
```

### 7. Terraform Value Formatting

```
String: "value" → "\"value\""
Number: 42 → "42"
Boolean: true → "true"
Module Ref: "module.x.y" → "module.x.y" (no quotes)
Map: { k: "v" } → "{\n  k = \"v\"\n}"
```

---

## Critical Files Reference

| Phase | File | Lines |
|-------|------|-------|
| Route Definition | [src/routes/apiRoutes.ts](src/routes/apiRoutes.ts) | 12-16 |
| Validation Middleware | [src/middleware/ValidationMiddleware.ts](src/middleware/ValidationMiddleware.ts) | 9-45 |
| Validation Utils | [src/utils/ValidationUtils.ts](src/utils/ValidationUtils.ts) | 20-86 |
| Controller | [src/controllers/TerraformController.ts](src/controllers/TerraformController.ts) | 21-249 |
| Transformation | [src/services/FrontendArchitectureTransformerService.ts](src/services/FrontendArchitectureTransformerService.ts) | 38-144 |
| Parsing | [src/services/ArchitectureParserService.ts](src/services/ArchitectureParserService.ts) | 69-104 |
| Mapping | [src/services/ModuleMapperService.ts](src/services/ModuleMapperService.ts) | 33-103 |
| Generation | [src/services/ModularTerraformGeneratorService.ts](src/services/ModularTerraformGeneratorService.ts) | 26-90 |
| File Service | [src/services/FileService.ts](src/services/FileService.ts) | 105-149 |

---

**End of Execution Flow**

This completes the entire execution flow from HTTP request to generated Terraform files, with every transformation and data modification documented in detail.
