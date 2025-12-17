# Frontend vs Backend Data Format Comparison

**Generated on:** 18 December 2025
**Repository:** Darch-Backend
**Purpose:** Document the transformation between frontend and backend architecture data formats

---

## Table of Contents

1. [Overview](#overview)
2. [Structure Changes](#structure-changes)
3. [Node/Resource Transformations](#noderesource-transformations)
4. [Fields Removed in Backend](#fields-removed-in-backend)
5. [Configuration Transformations](#configuration-transformations)
6. [Specific Resource Type Examples](#specific-resource-type-examples)
7. [Connection Transformations](#connection-transformations)
8. [ID Field Removal Pattern](#id-field-removal-pattern)
9. [Summary of Changes](#summary-of-changes)
10. [Transformation Logic](#transformation-logic)

---

## Overview

The Darch system accepts architecture data in two formats:

1. **Frontend Format**: Rich format with UI metadata (positions, icons, dimensions, handles)
2. **Backend Format**: Minimal format with only infrastructure-relevant data

The backend automatically detects and transforms frontend format to backend format before processing.

---

## Structure Changes

### Frontend Format (Top Level)

The frontend format now uses `resources` as the key (previously used `nodes` in older versions):

**Current Frontend Format:**
```json
{
  "metadata": { ... },
  "resources": [ ... ],    // Array of UI resources (current)
  "connections": [ ... ],
  "variables": {},
  "outputs": {}
}
```

**Legacy Frontend Format:**
```json
{
  "metadata": { ... },
  "nodes": [ ... ],        // Array of UI nodes (legacy - still supported)
  "connections": [ ... ],
  "variables": {},
  "outputs": {}
}
```

### Backend Format (Top Level)

```json
{
  "metadata": { ... },
  "nodes": [ ... ],        // Array of infrastructure nodes (backend internal format)
  "connections": [ ... ],
  "variables": {},
  "outputs": {}
}
```

**Key Changes**:
- Frontend now uses `resources` (previously `nodes`)
- Backend still uses `nodes` internally after transformation
- Backend supports **both** frontend formats for backward compatibility

---

## Node/Resource Transformations

### Frontend Resource Structure

Frontend resources (previously called nodes) contain rich UI metadata for canvas rendering:

```json
{
  "id": "aws-ec2-lfa9wf",
  "nodeType": "awsService",
  "resourceType": "aws-ec2",
  "name": "EC2",
  "icon": "/aws_icons/compute/32/arch_amazon_ec2_32.svg",
  "position": {
    "x": 255.21890842374478,
    "y": 59.46848351621236
  },
  "configuration": { ... },
  "parentId": "aws-security-group-p6jd10"
}
```

**For Containers (VPC, Subnet, etc.):**

```json
{
  "id": "aws-vpc-9ygafh",
  "nodeType": "awsContainer",
  "resourceType": "aws-vpc",
  "name": "VPC",
  "icon": "/aws_icons/networking_content_delivery/32/arch_amazon_virtual_private_cloud_32.svg",
  "position": {
    "x": 26.617111042872352,
    "y": 53.65248521568358
  },
  "dimensions": {
    "width": 841,
    "height": 509
  },
  "configuration": { ... },
  "parentId": "aws-region-wns8p3"
}
```

### Backend Node Structure

Backend nodes (internally still called nodes) contain only infrastructure data:

```json
{
  "id": "aws-ec2-lfa9wf",
  "type": "aws-ec2",              // resourceType renamed to type
  "name": "EC2",
  "configuration": { ... },       // Cleaned configuration (see below)
  "parentId": "aws-security-group-p6jd10"
}
```

---

## Fields Removed in Backend

The following fields are **completely removed** during transformation as they are UI-specific:

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `nodeType` | string | UI categorization | `"awsService"`, `"awsContainer"` |
| `icon` | string | UI icon path | `"/aws_icons/compute/32/arch_amazon_ec2_32.svg"` |
| `position` | object | Canvas coordinates | `{ "x": 255.21, "y": 59.46 }` |
| `dimensions` | object | Container size | `{ "width": 841, "height": 509 }` |
| `sourceHandle` | string | Connection anchor | `"bottom-source"`, `"left-source"` |
| `targetHandle` | string | Connection anchor | `"top-target"`, `"right-target"` |

### Visual Comparison

```
Frontend Resource (12 fields)      Backend Node (5 fields)
├── id                        →    ├── id
├── nodeType                  ✗
├── resourceType              →    ├── type
├── name                      →    ├── name
├── icon                      ✗
├── position                  ✗
├── dimensions                ✗
├── configuration             →    ├── configuration (cleaned)
└── parentId                  →    └── parentId
```

---

## Configuration Transformations

### A. ID Fields Removed

All auto-generated ID fields with label values are removed from configurations.

**Pattern**: Fields matching `/^aws[A-Z][a-zA-Z]*Id$/` with values like `"AWS Xxx"` are removed.

#### Example: VPC Configuration

**Frontend:**
```json
{
  "configuration": {
    "awsVpcId": "AWS VPC",           // ❌ Removed (auto-generated label)
    "cidrBlock": "10.0.0.0/16",      // ✅ Kept
    "awsRegionId": "us-east-1",      // ✅ Kept (reference to region)
    "description": "",               // ✅ Kept
    "enableDnsSupport": true,        // ✅ Kept
    "enableDnsHostnames": false,     // ✅ Kept
    "instanceTenancy": "default",    // ✅ Kept
    "tags": {
      "Name": "MyVPC"
    }
  }
}
```

**Backend:**
```json
{
  "configuration": {
    "cidrBlock": "10.0.0.0/16",
    "awsRegionId": "us-east-1",
    "description": "",
    "enableDnsSupport": true,
    "enableDnsHostnames": false,
    "instanceTenancy": "default",
    "tags": {
      "Name": "MyVPC"
    }
  }
}
```

### B. Reference Fields Preserved

Foreign key references (IDs pointing to other resources) are **always kept**:

```json
{
  "configuration": {
    "awsVpcId": "aws-vpc-9ygafh",                    // ✅ Kept (reference)
    "awsRegionId": "us-east-1",                      // ✅ Kept (reference)
    "awsAvailabilityZone": "us-east-1a",             // ✅ Kept (reference)
    "subnetId": "aws-public-subnet-dd58s3",          // ✅ Kept (reference)
    "securityGroups": ["aws-security-group-p6jd10"], // ✅ Kept (reference)
    "awsInternetGatewayId": "aws-internet-gateway-ge5f8u" // ✅ Kept (reference)
  }
}
```

### C. Decision Logic

```
Field name matches pattern: /^aws[A-Z][a-zA-Z]*Id$/
    ↓
Check value:
    ├─ If value starts with "AWS " → ❌ REMOVE (label)
    └─ If value is resource ID or region code → ✅ KEEP (reference)
```

**Examples:**

| Field | Value | Action | Reason |
|-------|-------|--------|--------|
| `awsVpcId` | `"AWS VPC"` | ❌ Remove | Auto-generated label |
| `awsVpcId` | `"aws-vpc-9ygafh"` | ✅ Keep | Resource reference |
| `awsRegionId` | `"AWS Region"` | ❌ Remove | Auto-generated label |
| `awsRegionId` | `"us-east-1"` | ✅ Keep | Region reference |
| `awsEc2Id` | `"AWS EC2"` | ❌ Remove | Auto-generated label |
| `subnetId` | `"aws-public-subnet-dd58s3"` | ✅ Keep | Resource reference |

---

## Specific Resource Type Examples

### 1. Region Resource

**Frontend:**
```json
{
  "id": "aws-region-wns8p3",
  "nodeType": "awsContainer",
  "resourceType": "aws-region",
  "name": "Region",
  "icon": "/aws_icons/uncategorized/32/aws_cloud_32.svg",
  "position": { "x": 460.87, "y": -24.53 },
  "dimensions": { "width": 898, "height": 594 },
  "configuration": {
    "awsRegionId": "AWS Region",     // ❌ Removed
    "region": "us-east-1",
    "regionName": "US East (N. Virginia)",
    "description": "",
    "isEnabled": true,
    "isDefault": true,
    "tags": { "Name": "MyRegion" }
  }
}
```

**Backend:**
```json
{
  "id": "aws-region-wns8p3",
  "type": "aws-region",
  "name": "Region",
  "configuration": {
    "region": "us-east-1",
    "regionName": "US East (N. Virginia)",
    "description": "",
    "isEnabled": true,
    "isDefault": true,
    "tags": { "Name": "MyRegion" }
  }
}
```

**Removed**: `nodeType`, `icon`, `position`, `dimensions`, `awsRegionId: "AWS Region"`

---

### 2. VPC Resource

**Frontend:**
```json
{
  "id": "aws-vpc-9ygafh",
  "nodeType": "awsContainer",
  "resourceType": "aws-vpc",
  "name": "VPC",
  "icon": "/aws_icons/networking_content_delivery/32/arch_amazon_virtual_private_cloud_32.svg",
  "position": { "x": 26.61, "y": 53.65 },
  "dimensions": { "width": 841, "height": 509 },
  "configuration": {
    "awsVpcId": "AWS VPC",            // ❌ Removed
    "cidrBlock": "10.0.0.0/16",
    "awsRegionId": "us-east-1",       // ✅ Kept (reference)
    "description": "",
    "enableDnsSupport": true,
    "enableDnsHostnames": false,
    "instanceTenancy": "default",
    "assignGeneratedIpv6CidrBlock": false,
    "tags": { "Name": "MyVPC" }
  },
  "parentId": "aws-region-wns8p3"
}
```

**Backend:**
```json
{
  "id": "aws-vpc-9ygafh",
  "type": "aws-vpc",
  "name": "VPC",
  "configuration": {
    "cidrBlock": "10.0.0.0/16",
    "awsRegionId": "us-east-1",
    "description": "",
    "enableDnsSupport": true,
    "enableDnsHostnames": false,
    "instanceTenancy": "default",
    "assignGeneratedIpv6CidrBlock": false,
    "tags": { "Name": "MyVPC" }
  },
  "parentId": "aws-region-wns8p3"
}
```

---

### 3. Public Subnet Resource

**Frontend:**
```json
{
  "id": "aws-public-subnet-dd58s3",
  "nodeType": "awsContainer",
  "resourceType": "aws-public-subnet",
  "name": "PublicSubnet",
  "icon": "/aws_icons/uncategorized/32/public_subnet_32.svg",
  "position": { "x": 39.64, "y": 61.94 },
  "dimensions": { "width": 710, "height": 269 },
  "configuration": {
    "awsPublicSubnetId": "AWS Public Subnet",  // ❌ Removed
    "cidrBlock": "10.0.0.0/24",
    "awsVpcId": "aws-vpc-9ygafh",              // ✅ Kept (reference)
    "awsRegionId": "us-east-1",                // ✅ Kept (reference)
    "awsAvailabilityZone": "us-east-1a",       // ✅ Kept (reference)
    "mapPublicIpOnLaunch": true,
    "tags": { "Name": "MyPublicSubnet" }
  },
  "parentId": "aws-availability-zone-gzqtz1"
}
```

**Backend:**
```json
{
  "id": "aws-public-subnet-dd58s3",
  "type": "aws-public-subnet",
  "name": "PublicSubnet",
  "configuration": {
    "cidrBlock": "10.0.0.0/24",
    "awsVpcId": "aws-vpc-9ygafh",
    "awsRegionId": "us-east-1",
    "awsAvailabilityZone": "us-east-1a",
    "mapPublicIpOnLaunch": true,
    "tags": { "Name": "MyPublicSubnet" }
  },
  "parentId": "aws-availability-zone-gzqtz1"
}
```

---

### 4. Security Group Resource

**Frontend:**
```json
{
  "id": "aws-security-group-p6jd10",
  "nodeType": "awsContainer",
  "resourceType": "aws-security-group",
  "name": "SecurityGroup",
  "icon": "/aws_icons/uncategorized/32/ec2_instance_contents_32.svg",
  "position": { "x": 50.79, "y": 35.92 },
  "dimensions": { "width": 588, "height": 200 },
  "configuration": {
    "awsSecurityGroupId": "AWS Security Group",  // ❌ Removed
    "name": "",
    "awsVpcId": "aws-vpc-9ygafh",                // ✅ Kept (reference)
    "description": "Managed by Terraform",
    "ingressRules": [],
    "egressRules": [
      {
        "protocol": "all",
        "fromPort": 0,
        "toPort": 0,
        "port": "all",
        "cidrBlocks": ["0.0.0.0/0"],
        "ipv6CidrBlocks": ["::/0"],
        "destination": "0.0.0.0/0",
        "description": "Allow all outbound traffic"
      }
    ],
    "revokeRulesOnDelete": false,
    "tags": { "Name": "MySecurityGroup" }
  },
  "parentId": "aws-public-subnet-dd58s3"
}
```

**Backend:**
```json
{
  "id": "aws-security-group-p6jd10",
  "type": "aws-security-group",
  "name": "SecurityGroup",
  "configuration": {
    "name": "",
    "awsVpcId": "aws-vpc-9ygafh",
    "description": "Managed by Terraform",
    "ingressRules": [],
    "egressRules": [
      {
        "protocol": "all",
        "fromPort": 0,
        "toPort": 0,
        "port": "all",
        "cidrBlocks": ["0.0.0.0/0"],
        "ipv6CidrBlocks": ["::/0"],
        "destination": "0.0.0.0/0",
        "description": "Allow all outbound traffic"
      }
    ],
    "revokeRulesOnDelete": false,
    "tags": { "Name": "MySecurityGroup" }
  },
  "parentId": "aws-public-subnet-dd58s3"
}
```

---

### 5. EC2 Instance Resource

**Frontend:**
```json
{
  "id": "aws-ec2-lfa9wf",
  "nodeType": "awsService",
  "resourceType": "aws-ec2",
  "name": "EC2",
  "icon": "/aws_icons/compute/32/arch_amazon_ec2_32.svg",
  "position": { "x": 255.21, "y": 59.46 },
  "configuration": {
    "awsEc2Id": "AWS EC2",                           // ❌ Removed
    "instanceType": "t3.micro",
    "amiId": "ami-00ca570c1b6d79f36",
    "keyPairName": "",
    "awsRegionId": "us-east-1",                      // ✅ Kept (reference)
    "awsAvailabilityZone": "us-east-1a",             // ✅ Kept (reference)
    "subnetId": "aws-public-subnet-dd58s3",          // ✅ Kept (reference)
    "securityGroups": ["aws-security-group-p6jd10"], // ✅ Kept (reference)
    "rootVolumeSize": 8,
    "rootVolumeType": "gp3",
    "deleteOnTermination": true,
    "encrypted": false,
    "ebsOptimized": false,
    "associatePublicIpAddress": false,
    "metadataOptions": {
      "httpEndpoint": "enabled",
      "httpTokens": "optional"
    },
    "tags": { "Name": "MyEC2Instance" }
  },
  "parentId": "aws-security-group-p6jd10"
}
```

**Backend:**
```json
{
  "id": "aws-ec2-lfa9wf",
  "type": "aws-ec2",
  "name": "EC2",
  "configuration": {
    "instanceType": "t3.micro",
    "amiId": "ami-00ca570c1b6d79f36",
    "keyPairName": "",
    "awsRegionId": "us-east-1",
    "awsAvailabilityZone": "us-east-1a",
    "subnetId": "aws-public-subnet-dd58s3",
    "securityGroups": ["aws-security-group-p6jd10"],
    "rootVolumeSize": 8,
    "rootVolumeType": "gp3",
    "deleteOnTermination": true,
    "encrypted": false,
    "ebsOptimized": false,
    "associatePublicIpAddress": false,
    "metadataOptions": {
      "httpEndpoint": "enabled",
      "httpTokens": "optional"
    },
    "tags": { "Name": "MyEC2Instance" }
  },
  "parentId": "aws-security-group-p6jd10"
}
```

---

### 6. Route Table Resource

**Frontend:**
```json
{
  "id": "aws-route-table-l1qqd2",
  "nodeType": "awsService",
  "resourceType": "aws-route-table",
  "name": "RouteTable",
  "icon": "/aws_icons/networking_content_delivery/48/res_amazon_route_53_route_table_48.svg",
  "position": { "x": 460.88, "y": 14.86 },
  "configuration": {
    "awsRouteTableId": "AWS Route Table",              // ❌ Removed
    "awsVpcId": "aws-vpc-9ygafh",                      // ✅ Kept (reference)
    "awsInternetGatewayId": "aws-internet-gateway-ge5f8u", // ✅ Kept (reference)
    "awsSubnetId": "aws-public-subnet-dd58s3",         // ✅ Kept (reference)
    "routes": [],
    "associations": [],
    "propagatingVgws": [],
    "description": "",
    "tags": { "Name": "MyRouteTable" }
  },
  "parentId": "aws-vpc-9ygafh"
}
```

**Backend:**
```json
{
  "id": "aws-route-table-l1qqd2",
  "type": "aws-route-table",
  "name": "RouteTable",
  "configuration": {
    "awsVpcId": "aws-vpc-9ygafh",
    "awsInternetGatewayId": "aws-internet-gateway-ge5f8u",
    "awsSubnetId": "aws-public-subnet-dd58s3",
    "routes": [],
    "associations": [],
    "propagatingVgws": [],
    "description": "",
    "tags": { "Name": "MyRouteTable" }
  },
  "parentId": "aws-vpc-9ygafh"
}
```

---

### 7. Internet Gateway Resource

**Frontend:**
```json
{
  "id": "aws-internet-gateway-ge5f8u",
  "nodeType": "awsService",
  "resourceType": "aws-internet-gateway",
  "name": "InternetGateway",
  "icon": "/aws_icons/networking_content_delivery/48/res_amazon_vpc_internet_gateway_48.svg",
  "position": { "x": 307.25, "y": 12.38 },
  "configuration": {
    "awsInternetGatewayId": "AWS Internet Gateway", // ❌ Removed
    "awsVpcId": "aws-vpc-9ygafh",                   // ✅ Kept (reference)
    "description": "",
    "tags": { "Name": "MyInternetGateway" }
  },
  "parentId": "aws-vpc-9ygafh"
}
```

**Backend:**
```json
{
  "id": "aws-internet-gateway-ge5f8u",
  "type": "aws-internet-gateway",
  "name": "InternetGateway",
  "configuration": {
    "awsVpcId": "aws-vpc-9ygafh",
    "description": "",
    "tags": { "Name": "MyInternetGateway" }
  },
  "parentId": "aws-vpc-9ygafh"
}
```

---

## Connection Transformations

Connections are simplified to only include essential relationship data.

### Frontend Connection

```json
{
  "id": "edge-wcwfjw",
  "source": "aws-route-table-l1qqd2",
  "target": "aws-public-subnet-dd58s3",
  "sourceHandle": "bottom-source",     // ❌ Removed (UI anchor point)
  "targetHandle": "top-target",        // ❌ Removed (UI anchor point)
  "type": "smoothstep"                 // ❌ Removed (UI line style)
}
```

### Backend Connection

```json
{
  "id": "edge-wcwfjw",
  "source": "aws-route-table-l1qqd2",
  "target": "aws-public-subnet-dd58s3"
}
```

**Removed Fields:**
- `sourceHandle`: UI-specific anchor point (e.g., "bottom-source", "left-source")
- `targetHandle`: UI-specific anchor point (e.g., "top-target", "right-target")
- `type`: UI-specific line rendering style (e.g., "smoothstep", "straight")

---

## ID Field Removal Pattern

### Pattern Recognition

The backend uses this regex pattern to identify auto-generated ID fields:

```regex
/^aws[A-Z][a-zA-Z]*Id$/
```

### Examples of Matched Fields

| Field Name | Matches Pattern | Example Value (Label) | Example Value (Reference) |
|------------|----------------|----------------------|--------------------------|
| `awsVpcId` | ✅ Yes | `"AWS VPC"` ❌ Remove | `"aws-vpc-9ygafh"` ✅ Keep |
| `awsRegionId` | ✅ Yes | `"AWS Region"` ❌ Remove | `"us-east-1"` ✅ Keep |
| `awsEc2Id` | ✅ Yes | `"AWS EC2"` ❌ Remove | N/A (not used as reference) |
| `awsSecurityGroupId` | ✅ Yes | `"AWS Security Group"` ❌ Remove | N/A |
| `awsPublicSubnetId` | ✅ Yes | `"AWS Public Subnet"` ❌ Remove | N/A |
| `awsAvailabilityZoneId` | ✅ Yes | `"AWS Availability Zone"` ❌ Remove | N/A |
| `awsRouteTableId` | ✅ Yes | `"AWS Route Table"` ❌ Remove | N/A |
| `awsInternetGatewayId` | ✅ Yes | `"AWS Internet Gateway"` ❌ Remove | `"aws-internet-gateway-ge5f8u"` ✅ Keep |
| `awsNatGatewayId` | ✅ Yes | `"AWS NAT Gateway"` ❌ Remove | `"aws-nat-gateway-xyz"` ✅ Keep |
| `subnetId` | ❌ No | N/A | `"aws-public-subnet-dd58s3"` ✅ Keep |
| `securityGroups` | ❌ No | N/A | `["aws-security-group-p6jd10"]` ✅ Keep |
| `instanceType` | ❌ No | N/A | `"t3.micro"` ✅ Keep |
| `cidrBlock` | ❌ No | N/A | `"10.0.0.0/16"` ✅ Keep |

### Removal Logic

```typescript
function shouldRemoveField(key: string, value: any): boolean {
  // Check if field name matches the pattern
  const matchesPattern = /^aws[A-Z][a-zA-Z]*Id$/.test(key);

  if (!matchesPattern) {
    return false; // Keep fields that don't match pattern
  }

  // Check if value is a label (starts with "AWS ")
  const isLabel = typeof value === 'string' && value.startsWith('AWS ');

  return isLabel; // Remove only if it's a label
}
```

### Examples

```typescript
// Labels (auto-generated) - REMOVED
shouldRemoveField('awsVpcId', 'AWS VPC')                    // true ❌
shouldRemoveField('awsRegionId', 'AWS Region')              // true ❌
shouldRemoveField('awsEc2Id', 'AWS EC2')                    // true ❌
shouldRemoveField('awsSecurityGroupId', 'AWS Security Group') // true ❌

// References (actual IDs) - KEPT
shouldRemoveField('awsVpcId', 'aws-vpc-9ygafh')            // false ✅
shouldRemoveField('awsRegionId', 'us-east-1')              // false ✅
shouldRemoveField('awsInternetGatewayId', 'aws-internet-gateway-ge5f8u') // false ✅

// Non-matching fields - KEPT
shouldRemoveField('subnetId', 'aws-public-subnet-dd58s3')  // false ✅
shouldRemoveField('cidrBlock', '10.0.0.0/16')              // false ✅
shouldRemoveField('instanceType', 't3.micro')              // false ✅
```

---

## Summary of Changes

### Complete Transformation Table

| Category | Frontend | Backend | Status | Purpose |
|----------|----------|---------|--------|---------|
| **Root Structure** |
| Root key | `nodes` | `resources` | Renamed | Semantic clarity |
| Metadata | `metadata` | `metadata` | ✅ Kept | Project info |
| Connections | `connections` | `connections` | ✅ Kept (cleaned) | Resource relationships |
| Variables | `variables` | `variables` | ✅ Kept | Input variables |
| Outputs | `outputs` | `outputs` | ✅ Kept | Output values |
| **Node/Resource Level** |
| Identifier | `id` | `id` | ✅ Kept | Unique resource ID |
| Type info | `nodeType` + `resourceType` | `type` | Simplified | Resource type |
| Name | `name` | `name` | ✅ Kept | Resource name |
| Configuration | `configuration` | `configuration` | ✅ Kept (cleaned) | Resource config |
| Parent | `parentId` | `parentId` | ✅ Kept | Hierarchy |
| UI icon | `icon` | N/A | ❌ Removed | Frontend rendering |
| UI position | `position` | N/A | ❌ Removed | Canvas coordinates |
| UI size | `dimensions` | N/A | ❌ Removed | Container sizing |
| **Connection Level** |
| Identifier | `id` | `id` | ✅ Kept | Unique connection ID |
| Source | `source` | `source` | ✅ Kept | Source resource |
| Target | `target` | `target` | ✅ Kept | Target resource |
| Source UI | `sourceHandle` | N/A | ❌ Removed | UI anchor point |
| Target UI | `targetHandle` | N/A | ❌ Removed | UI anchor point |
| Line style | `type` | N/A | ❌ Removed | UI rendering |
| **Configuration Level** |
| Auto ID labels | `awsXxxId: "AWS Xxx"` | N/A | ❌ Removed | Auto-generated |
| ID references | `awsXxxId: "aws-xxx-id"` | `awsXxxId: "aws-xxx-id"` | ✅ Kept | Resource links |
| Region refs | `awsRegionId: "us-east-1"` | `awsRegionId: "us-east-1"` | ✅ Kept | Region reference |
| All other config | Various | Various | ✅ Kept | Resource settings |

### Data Reduction Statistics

**Typical Node (e.g., EC2 Instance):**
- Frontend fields: ~12-15 fields
- Backend fields: ~5 fields
- Reduction: ~50-60% fewer fields

**Typical Container (e.g., VPC):**
- Frontend fields: ~13-16 fields
- Backend fields: ~5 fields
- Reduction: ~60-70% fewer fields

**Configuration Cleaning:**
- Frontend ID fields: 1 auto-label + multiple references
- Backend ID fields: Only references kept
- Reduction: 1 field removed per resource type

---

## Transformation Logic

### Pseudo-code Implementation

```typescript
/**
 * Transform frontend architecture data to backend format
 */
function transformFrontendToBackend(frontendData: FrontendArchitectureData): BackendArchitectureData {
  return {
    metadata: frontendData.metadata,

    // Transform nodes → resources
    resources: frontendData.nodes.map(node => ({
      id: node.id,
      type: node.resourceType,  // resourceType → type
      name: node.name,
      configuration: cleanConfiguration(node.configuration),
      ...(node.parentId && { parentId: node.parentId })
    })),

    // Transform connections (remove UI properties)
    connections: frontendData.connections.map(conn => ({
      id: conn.id,
      source: conn.source,
      target: conn.target
    })),

    variables: frontendData.variables || {},
    outputs: frontendData.outputs || {}
  };
}

/**
 * Clean configuration by removing auto-generated ID labels
 */
function cleanConfiguration(config: Record<string, any>): Record<string, any> {
  const cleaned = { ...config };

  for (const key in cleaned) {
    if (shouldRemoveField(key, cleaned[key])) {
      delete cleaned[key];
    }
  }

  return cleaned;
}

/**
 * Determine if a field should be removed
 */
function shouldRemoveField(key: string, value: any): boolean {
  // Pattern for AWS ID fields: awsXxxId
  const awsIdPattern = /^aws[A-Z][a-zA-Z]*Id$/;

  // Only check fields that match the pattern
  if (!awsIdPattern.test(key)) {
    return false;
  }

  // Remove if value is a label (starts with "AWS ")
  if (typeof value === 'string' && value.startsWith('AWS ')) {
    return true;
  }

  // Keep everything else (references, region codes, etc.)
  return false;
}

/**
 * Detect if data is in frontend format
 */
function isFrontendFormat(data: any): boolean {
  if (!data?.metadata || !data?.nodes || !Array.isArray(data.nodes)) {
    return false;
  }

  // Check if any node has frontend-specific properties
  return data.nodes.some((node: any) =>
    node.nodeType &&
    (node.nodeType === 'awsService' || node.nodeType === 'awsContainer') &&
    node.resourceType &&
    node.resourceType.startsWith('aws-')
  );
}
```

### Transformation Flow

```
Input: Frontend Architecture Data
    ↓
1. Detect Format
    ├─ Check for: nodeType, icon, position properties
    ├─ Check for: resourceType starting with "aws-"
    └─ If frontend format detected → continue transformation
    ↓
2. Transform Root Structure
    ├─ Keep: metadata, variables, outputs
    └─ Rename: nodes → resources
    ↓
3. Transform Each Node/Resource
    ├─ Keep: id, name, parentId
    ├─ Rename: resourceType → type
    ├─ Remove: nodeType, icon, position, dimensions
    └─ Clean: configuration object
    ↓
4. Clean Configuration
    ├─ Iterate through all config properties
    ├─ Check each property:
    │   ├─ Matches /^aws[A-Z][a-zA-Z]*Id$/ ?
    │   │   ├─ Value starts with "AWS " ? → ❌ Remove
    │   │   └─ Else → ✅ Keep (reference)
    │   └─ Doesn't match pattern → ✅ Keep
    └─ Return cleaned config
    ↓
5. Transform Connections
    ├─ Keep: id, source, target
    └─ Remove: sourceHandle, targetHandle, type
    ↓
Output: Backend Architecture Data
```

### Error Handling

```typescript
function safeTransform(frontendData: any): TransformResult {
  try {
    // Validate input structure
    if (!frontendData || typeof frontendData !== 'object') {
      return {
        success: false,
        error: 'Invalid input data',
        transformed: null
      };
    }

    // Check required fields
    if (!frontendData.metadata || !frontendData.nodes) {
      return {
        success: false,
        error: 'Missing required fields: metadata or nodes',
        transformed: null
      };
    }

    // Perform transformation
    const backendData = transformFrontendToBackend(frontendData);

    // Validate output
    if (!backendData.resources || backendData.resources.length === 0) {
      return {
        success: false,
        error: 'Transformation resulted in no resources',
        transformed: null
      };
    }

    return {
      success: true,
      error: null,
      transformed: backendData,
      stats: {
        nodesTransformed: backendData.resources.length,
        connectionsTransformed: backendData.connections.length,
        fieldsRemoved: calculateRemovedFields(frontendData, backendData)
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      transformed: null
    };
  }
}
```

---

## TypeScript Interface Definitions

### Frontend Interfaces

```typescript
interface FrontendArchitectureData {
  metadata: ArchitectureMetadata;
  nodes: FrontendNode[];
  connections: FrontendConnection[];
  variables?: Record<string, any>;
  outputs?: Record<string, any>;
}

interface FrontendNode {
  id: string;
  nodeType: 'awsService' | 'awsContainer';
  resourceType: string;
  name: string;
  icon: string;
  position: {
    x: number;
    y: number;
  };
  dimensions?: {
    width: number;
    height: number;
  };
  configuration: Record<string, any>;
  parentId?: string;
}

interface FrontendConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}
```

### Backend Interfaces

```typescript
interface BackendArchitectureData {
  metadata: ArchitectureMetadata;
  resources: BackendResource[];
  connections: BackendConnection[];
  variables?: Record<string, any>;
  outputs?: Record<string, any>;
}

interface BackendResource {
  id: string;
  type: string;
  name: string;
  configuration: Record<string, any>;
  parentId?: string;
}

interface BackendConnection {
  id: string;
  source: string;
  target: string;
}

interface ArchitectureMetadata {
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  lastModified: string;
  provider: string;
}
```

---

## Practical Examples

### Example 1: Simple VPC Architecture

**Frontend Input:**
```json
{
  "metadata": {
    "name": "Simple VPC",
    "version": "1.0.0",
    "provider": "aws",
    "createdAt": "2025-12-18T10:00:00.000Z",
    "lastModified": "2025-12-18T10:00:00.000Z"
  },
  "nodes": [
    {
      "id": "vpc-1",
      "nodeType": "awsContainer",
      "resourceType": "aws-vpc",
      "name": "MyVPC",
      "icon": "/icons/vpc.svg",
      "position": { "x": 100, "y": 100 },
      "dimensions": { "width": 500, "height": 300 },
      "configuration": {
        "awsVpcId": "AWS VPC",
        "cidrBlock": "10.0.0.0/16"
      }
    }
  ],
  "connections": []
}
```

**Backend Output:**
```json
{
  "metadata": {
    "name": "Simple VPC",
    "version": "1.0.0",
    "provider": "aws",
    "createdAt": "2025-12-18T10:00:00.000Z",
    "lastModified": "2025-12-18T10:00:00.000Z"
  },
  "resources": [
    {
      "id": "vpc-1",
      "type": "aws-vpc",
      "name": "MyVPC",
      "configuration": {
        "cidrBlock": "10.0.0.0/16"
      }
    }
  ],
  "connections": []
}
```

### Example 2: Connected Resources

**Frontend Input:**
```json
{
  "nodes": [
    {
      "id": "vpc-1",
      "nodeType": "awsContainer",
      "resourceType": "aws-vpc",
      "name": "VPC",
      "icon": "/icons/vpc.svg",
      "position": { "x": 100, "y": 100 },
      "configuration": {
        "awsVpcId": "AWS VPC",
        "cidrBlock": "10.0.0.0/16"
      }
    },
    {
      "id": "igw-1",
      "nodeType": "awsService",
      "resourceType": "aws-internet-gateway",
      "name": "IGW",
      "icon": "/icons/igw.svg",
      "position": { "x": 200, "y": 50 },
      "configuration": {
        "awsInternetGatewayId": "AWS Internet Gateway",
        "awsVpcId": "vpc-1"
      },
      "parentId": "vpc-1"
    }
  ],
  "connections": [
    {
      "id": "conn-1",
      "source": "igw-1",
      "target": "vpc-1",
      "sourceHandle": "bottom-source",
      "targetHandle": "top-target",
      "type": "smoothstep"
    }
  ]
}
```

**Backend Output:**
```json
{
  "resources": [
    {
      "id": "vpc-1",
      "type": "aws-vpc",
      "name": "VPC",
      "configuration": {
        "cidrBlock": "10.0.0.0/16"
      }
    },
    {
      "id": "igw-1",
      "type": "aws-internet-gateway",
      "name": "IGW",
      "configuration": {
        "awsVpcId": "vpc-1"
      },
      "parentId": "vpc-1"
    }
  ],
  "connections": [
    {
      "id": "conn-1",
      "source": "igw-1",
      "target": "vpc-1"
    }
  ]
}
```

---

## Benefits of Transformation

### 1. **Data Efficiency**
- **50-70% reduction** in payload size
- Faster API transmission
- Reduced storage requirements

### 2. **Backend Simplicity**
- Backend doesn't need to handle UI metadata
- Cleaner Terraform generation logic
- Easier to maintain and debug

### 3. **Separation of Concerns**
- UI concerns (positioning, styling) stay in frontend
- Infrastructure concerns (configuration, relationships) in backend
- Clear boundary between presentation and logic layers

### 4. **Flexibility**
- Frontend can change UI implementation without affecting backend
- Backend API remains stable
- Easy to support multiple frontend versions

### 5. **Security**
- No sensitive UI data transmitted unnecessarily
- Smaller attack surface
- Easier to audit infrastructure changes

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-18 | System | Initial documentation with comprehensive examples |

---

**End of Documentation**
