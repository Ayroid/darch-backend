# Frontend JSON Validation Requirements

## 🚨 Critical Issues Found

Based on the current API validation errors, here are the mandatory fields that must be provided by the frontend for each AWS resource type:

---

## 📋 Mandatory Fields by Resource Type

### 🌍 **AWS Region** (`aws-region`)
```typescript
configuration: {
  awsRegionId: string;        // ✅ Present
  region: string;             // ✅ Present
  regionName: string;         // ✅ Present
  description?: string;       // ✅ Present
  isEnabled: boolean;         // ✅ Present
  isDefault: boolean;         // ✅ Present
  tags?: string;              // ✅ Present
}
```

**Status**: ✅ **VALID** - All required fields present

---

### 🏢 **Availability Zone** (`aws-availability-zone`)
```typescript
configuration: {
  awsAvailabilityZoneId: string;  // ✅ Present
  awsRegionId: string;            // ✅ Present
  availabilityZone: string;       // ✅ Present
  description?: string;           // ✅ Present
  isEnabled: boolean;             // ✅ Present
  isPreferred: boolean;           // ✅ Present
  tags?: string;                  // ✅ Present
}
```

**Status**: ✅ **VALID** - All required fields present

---

### 🌐 **VPC** (`aws-vpc`)
```typescript
configuration: {
  awsVpcId: string;               // ✅ Present
  cidr_block: string;             // 🚨 MISSING - Frontend sends 'cidrBlock'
  awsRegionId?: string;           // ✅ Present
  enable_dns_support?: boolean;   // 🚨 MISSING - Frontend sends 'enableDnsSupport'
  enable_dns_hostnames?: boolean; // 🚨 MISSING - Frontend sends 'enableDnsHostnames'
  tags?: Record<string, string>;  // 🚨 MISSING - Frontend sends string format
}
```

**❌ Issues**:
- `cidrBlock` → should be `cidr_block`
- `enableDnsSupport` → should be `enable_dns_support`
- `enableDnsHostnames` → should be `enable_dns_hostnames`
- `tags` should be object, not string

---

### 🔗 **Public Subnet** (`aws-public-subnet`)
```typescript
configuration: {
  awsPublicSubnetId: string;        // ✅ Present
  cidr_block: string;               // 🚨 MISSING - Frontend sends 'cidrBlock'
  availability_zone: string;        // 🚨 MISSING - Frontend sends 'awsAvailabilityZone'
  awsVpcId: string;                 // ✅ Present
  awsRegionId?: string;             // ✅ Present
  description?: string;             // ✅ Present
  map_public_ip_on_launch: boolean; // 🚨 MISSING - Frontend sends 'mapPublicIpOnLaunch'
  tags?: Record<string, string>;    // 🚨 MISSING - Frontend sends string format
}
```

**❌ Issues**:
- `cidrBlock` → should be `cidr_block`
- `awsAvailabilityZone` → should be `availability_zone`
- `mapPublicIpOnLaunch` → should be `map_public_ip_on_launch`
- `tags` should be object, not string

---

### 🔒 **Private Subnet** (`aws-private-subnet`)
```typescript
configuration: {
  awsPrivateSubnetId: string;       // ✅ Present
  cidr_block: string;               // 🚨 MISSING - Frontend sends 'cidrBlock'
  availability_zone: string;        // 🚨 MISSING - Frontend sends 'awsAvailabilityZone'
  awsVpcId: string;                 // ✅ Present
  awsRegionId?: string;             // ✅ Present
  description?: string;             // ✅ Present
  map_public_ip_on_launch: boolean; // 🚨 MISSING - Frontend sends 'mapPublicIpOnLaunch'
  enableNatGateway?: boolean;       // ✅ Present
  tags?: Record<string, string>;    // 🚨 MISSING - Frontend sends string format
}
```

**❌ Issues**: Same as Public Subnet

---

### 🛡️ **Security Group** (`aws-security-group`)
```typescript
configuration: {
  name: string;                     // 🚨 REQUIRED - Backend needs this
  awsSecurityGroupId?: string;      // ✅ Present
  description?: string;             // ✅ Present
  awsVpcId: string;                 // ✅ Present (as vpc_id)
  ingress_rules?: Array<{           // 🚨 Backend expects different format
    from_port: number;
    to_port: number;
    protocol: string;
    cidr_blocks?: string[];
    security_groups?: string[];
    description?: string;
  }>;
  egress_rules?: Array<{            // 🚨 Backend expects different format
    from_port: number;
    to_port: number;
    protocol: string;
    cidr_blocks?: string[];
    security_groups?: string[];
    description?: string;
  }>;
  tags?: Record<string, string>;
}
```

**❌ Issues**:
- Missing `name` field (required)
- `ingressRules`/`egressRules` format needs to match backend expectation

---

### 💻 **EC2 Instance** (`aws-ec2`)
```typescript
configuration: {
  awsEc2Id?: string;                    // ✅ Present
  instance_type: string;                // 🚨 MISSING - Frontend sends 'instanceType'
  ami_id?: string;                      // 🚨 MISSING - Frontend sends 'amiId'
  key_name?: string;                    // 🚨 MISSING - Frontend sends 'keyPairName'
  subnet_id: string;                    // 🚨 MISSING - Frontend sends 'subnetId'
  security_group_ids?: string[];       // 🚨 MISSING - Frontend sends 'securityGroups'
  associate_public_ip_address?: boolean;// 🚨 MISSING - Frontend sends 'associatePublicIpAddress'
  root_block_device?: {                 // 🚨 Frontend sends separate fields
    volume_type?: string;               // Frontend: 'rootVolumeType'
    volume_size?: number;               // Frontend: 'rootVolumeSize'
    encrypted?: boolean;                // Frontend: 'encrypted'
    delete_on_termination?: boolean;    // Frontend: 'deleteOnTermination'
  };
  ebs_block_device?: Array<{
    device_name: string;
    volume_type?: string;
    volume_size: number;
    encrypted?: boolean;
  }>;
  monitoring?: boolean;                 // 🚨 MISSING - Frontend sends 'detailedMonitoring'
  disable_api_termination?: boolean;    // 🚨 MISSING - Frontend sends 'terminationProtection'
  user_data?: string;                   // ✅ Present
  iam_instance_profile?: string;        // ✅ Present
  tags?: Record<string, string>;        // 🚨 Frontend sends object but validation may fail
}
```

**❌ Issues**:
- Field name mismatches for all major properties
- Root volume configuration structure mismatch

---

## 🔧 **Recommended Frontend Fixes**

### Option 1: Update Frontend to Match Backend (Recommended)
Update the frontend to send the exact field names expected by the backend:

```typescript
// Instead of:
{
  cidrBlock: "10.0.0.0/16",
  enableDnsSupport: true,
  enableDnsHostnames: true
}

// Send:
{
  cidr_block: "10.0.0.0/16",
  enable_dns_support: true,
  enable_dns_hostnames: true
}
```

### Option 2: Enhance Transformation Service
The current transformation service handles most conversions, but needs improvements for:
- Circular dependency detection (containers vs services)
- Better tag conversion
- Root block device structure

---

## 📝 **Field Mapping Reference**

| Frontend Field | Backend Field | Resource Types |
|---|---|---|
| `cidrBlock` | `cidr_block` | VPC, Subnets |
| `enableDnsSupport` | `enable_dns_support` | VPC |
| `enableDnsHostnames` | `enable_dns_hostnames` | VPC |
| `mapPublicIpOnLaunch` | `map_public_ip_on_launch` | Subnets |
| `awsAvailabilityZone` | `availability_zone` | Subnets |
| `instanceType` | `instance_type` | EC2 |
| `amiId` | `ami_id` | EC2 |
| `keyPairName` | `key_name` | EC2 |
| `subnetId` | `subnet_id` | EC2 |
| `securityGroups` | `security_group_ids` | EC2 |
| `associatePublicIpAddress` | `associate_public_ip_address` | EC2 |
| `detailedMonitoring` | `monitoring` | EC2 |
| `terminationProtection` | `disable_api_termination` | EC2 |
| `rootVolumeSize` | `root_block_device.volume_size` | EC2 |
| `rootVolumeType` | `root_block_device.volume_type` | EC2 |
| `deleteOnTermination` | `root_block_device.delete_on_termination` | EC2 |

---

## 🎯 **Next Steps**

1. **Fix Container vs Service Detection**: The backend is treating container nodes (VPC, subnets) as services, causing validation errors.

2. **Update Field Names**: Either update frontend to use backend field names, or enhance the transformation service.

3. **Fix Tag Format**: Convert string tags to object format consistently.

4. **Add Missing Required Fields**: Ensure all resources have their mandatory fields.

5. **Test with Simplified Payload**: Start with a minimal valid payload and gradually add complexity.

---

## 🧪 **Test Payload Template**

Here's a minimal valid payload for testing:

```json
{
  "architectureData": {
    "metadata": {
      "name": "Test Architecture",
      "description": "Simple test",
      "version": "1.0.0",
      "createdAt": "2025-09-10T17:00:00.000Z",
      "lastModified": "2025-09-10T17:00:00.000Z",
      "provider": "aws"
    },
    "nodes": [
      {
        "id": "vpc-1",
        "nodeType": "awsService",
        "resourceType": "vpc",
        "name": "Main VPC",
        "position": { "x": 100, "y": 100 },
        "configuration": {
          "cidr_block": "10.0.0.0/16",
          "enable_dns_support": true,
          "enable_dns_hostnames": true,
          "tags": {
            "Name": "Main VPC"
          }
        }
      }
    ],
    "connections": [],
    "variables": {},
    "outputs": {}
  },
  "projectName": "test-project"
}
```

This should pass validation and generate Terraform code successfully.
