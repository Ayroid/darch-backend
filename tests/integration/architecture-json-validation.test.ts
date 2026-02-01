/**
 * Integration tests for Architecture JSON validation
 * Tests various JSON structures against the backend normalization and generation pipeline
 */

import { ArchitectureNormalizerService } from "../../dist/services/ArchitectureNormalizerService.js";
import { SimplifiedTerraformGeneratorService } from "../../dist/services/SimplifiedTerraformGeneratorService.js";

// Test result tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<void> | void) {
  return async () => {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`  ✓ ${name}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({ name, passed: false, error: errorMsg });
      console.log(`  ✗ ${name}`);
      console.log(`    Error: ${errorMsg}`);
    }
  };
}

function expect(value: any) {
  return {
    toBe: (expected: any) => {
      if (value !== expected) {
        throw new Error(`Expected ${expected}, got ${value}`);
      }
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(value) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
      }
    },
    toBeTruthy: () => {
      if (!value) {
        throw new Error(`Expected truthy value, got ${value}`);
      }
    },
    toBeFalsy: () => {
      if (value) {
        throw new Error(`Expected falsy value, got ${value}`);
      }
    },
    toContain: (expected: any) => {
      if (typeof value === 'string' && !value.includes(expected)) {
        throw new Error(`Expected string to contain "${expected}"`);
      }
      if (Array.isArray(value) && !value.includes(expected)) {
        throw new Error(`Expected array to contain ${expected}`);
      }
    },
    toBeGreaterThan: (expected: number) => {
      if (value <= expected) {
        throw new Error(`Expected ${value} to be greater than ${expected}`);
      }
    },
    toHaveLength: (expected: number) => {
      if (value.length !== expected) {
        throw new Error(`Expected length ${expected}, got ${value.length}`);
      }
    },
    toMatch: (pattern: RegExp) => {
      if (!pattern.test(value)) {
        throw new Error(`Expected "${value}" to match ${pattern}`);
      }
    },
    not: {
      toContain: (expected: any) => {
        if (typeof value === 'string' && value.includes(expected)) {
          throw new Error(`Expected string NOT to contain "${expected}"`);
        }
      },
    },
  };
}

// ============================================================================
// TEST DATA: Various JSON structures from frontend
// ============================================================================

// Minimal valid architecture
const minimalArchitecture = {
  metadata: {
    name: "minimal-test",
    provider: "aws",
    region: "us-east-1",
  },
  resources: [
    {
      id: "aws-vpc-abc123",
      name: "VPC",
      resource_type: "aws-vpc",
      node_type: "aws_container",
      configuration: {
        cidr_block: "10.0.0.0/16",
      },
    },
  ],
  connections: [],
};

// Standard architecture with hierarchy
const standardArchitecture = {
  metadata: {
    name: "standard-test",
    description: "Standard VPC with subnet and EC2",
    version: "1.0.0",
    created_at: "2025-01-30T00:00:00.000Z",
    last_modified: "2025-01-30T00:00:00.000Z",
    provider: "aws",
    region: "us-east-1",
    environment: "development",
  },
  resources: [
    {
      id: "aws-vpc-lxys3o",
      name: "VPC",
      resource_type: "aws-vpc",
      node_type: "aws_container",
      position: { x: 100, y: 100 },
      dimensions: { width: 600, height: 400 },
      configuration: {
        cidr_block: "10.0.0.0/16",
        enable_dns_support: true,
        enable_dns_hostnames: true,
      },
    },
    {
      id: "aws-subnet-bg9i1u",
      name: "PublicSubnet",
      resource_type: "aws-public-subnet",
      node_type: "aws_container",
      parent_id: "aws-vpc-lxys3o",
      position: { x: 150, y: 150 },
      dimensions: { width: 300, height: 200 },
      configuration: {
        cidr_block: "10.0.1.0/24",
        availability_zone: "us-east-1a",
        map_public_ip_on_launch: true,
        vpc_id: "aws-vpc-lxys3o", // Node ID that needs resolution
      },
    },
    {
      id: "aws-ec2-qlqfpt",
      name: "WebServer",
      resource_type: "aws-ec2",
      node_type: "aws_service",
      parent_id: "aws-subnet-bg9i1u",
      position: { x: 200, y: 200 },
      configuration: {
        instance_type: "t3.micro",
        subnet_id: "aws-subnet-bg9i1u", // Node ID that needs resolution
      },
    },
  ],
  connections: [],
};

// Complex architecture with all resource types
const complexArchitecture = {
  metadata: {
    name: "complex-test",
    provider: "aws",
    region: "us-east-1",
    environment: "production",
    project: "darch-test",
  },
  resources: [
    {
      id: "aws-vpc-main",
      name: "MainVPC",
      resource_type: "aws-vpc",
      node_type: "aws_container",
      configuration: {
        cidr_block: "10.0.0.0/16",
        enable_dns_support: true,
        enable_dns_hostnames: true,
      },
    },
    {
      id: "aws-internet-gateway-igw1",
      name: "InternetGateway",
      resource_type: "aws-internet-gateway",
      node_type: "aws_service",
      parent_id: "aws-vpc-main",
      configuration: {
        vpc_id: "aws-vpc-main",
      },
    },
    {
      id: "aws-route-table-rt1",
      name: "PublicRouteTable",
      resource_type: "aws-route-table",
      node_type: "aws_service",
      parent_id: "aws-vpc-main",
      configuration: {
        vpc_id: "aws-vpc-main",
      },
    },
    {
      id: "aws-subnet-public1",
      name: "PublicSubnet1",
      resource_type: "aws-public-subnet",
      node_type: "aws_container",
      parent_id: "aws-vpc-main",
      configuration: {
        cidr_block: "10.0.1.0/24",
        availability_zone: "us-east-1a",
        vpc_id: "aws-vpc-main",
        subnet_type: "public",
      },
    },
    {
      id: "aws-subnet-private1",
      name: "PrivateSubnet1",
      resource_type: "aws-private-subnet",
      node_type: "aws_container",
      parent_id: "aws-vpc-main",
      configuration: {
        cidr_block: "10.0.2.0/24",
        availability_zone: "us-east-1a",
        vpc_id: "aws-vpc-main",
        subnet_type: "private",
      },
    },
    {
      id: "aws-nat-gateway-nat1",
      name: "NATGateway",
      resource_type: "aws-nat-gateway",
      node_type: "aws_service",
      parent_id: "aws-subnet-public1",
      configuration: {
        subnet_id: "aws-subnet-public1",
        connectivity_type: "public",
      },
    },
    {
      id: "aws-security-group-sg1",
      name: "WebSecurityGroup",
      resource_type: "aws-security-group",
      node_type: "aws_container",
      parent_id: "aws-subnet-public1",
      configuration: {
        name: "web-sg",
        description: "Security group for web servers",
        vpc_id: "aws-vpc-main",
        ingress_rules: [
          {
            from_port: 80,
            to_port: 80,
            protocol: "tcp",
            cidr_blocks: ["0.0.0.0/0"],
          },
          {
            from_port: 443,
            to_port: 443,
            protocol: "tcp",
            cidr_blocks: ["0.0.0.0/0"],
          },
        ],
        egress_rules: [
          {
            from_port: 0,
            to_port: 0,
            protocol: "-1",
            cidr_blocks: ["0.0.0.0/0"],
          },
        ],
      },
    },
    {
      id: "aws-ec2-web1",
      name: "WebServer1",
      resource_type: "aws-ec2",
      node_type: "aws_service",
      parent_id: "aws-security-group-sg1",
      configuration: {
        instance_type: "t3.small",
        subnet_id: "aws-subnet-public1",
        security_groups: ["aws-security-group-sg1"],
      },
    },
    {
      id: "aws-s3-bucket1",
      name: "AssetsBucket",
      resource_type: "aws-s3",
      node_type: "aws_service",
      configuration: {
        bucket_name: "my-assets-bucket",
        versioning_enabled: true,
      },
    },
    {
      id: "aws-rds-db1",
      name: "Database",
      resource_type: "aws-rds",
      node_type: "aws_service",
      parent_id: "aws-subnet-private1",
      configuration: {
        engine: "mysql",
        engine_version: "8.0",
        instance_class: "db.t3.micro",
        allocated_storage: 20,
        db_name: "appdb",
        username: "admin",
      },
    },
  ],
  connections: [
    {
      id: "edge-igw-to-rt",
      source: "aws-internet-gateway-igw1",
      target: "aws-route-table-rt1",
      source_handle: "bottom-source",
      target_handle: "top-target",
    },
    {
      id: "edge-rt-to-subnet",
      source: "aws-route-table-rt1",
      target: "aws-subnet-public1",
      source_handle: "bottom-source",
      target_handle: "top-target",
    },
  ],
};

// Architecture with edge cases
const edgeCaseArchitecture = {
  metadata: {
    name: "edge-cases",
    provider: "aws",
  },
  resources: [
    // Resource with minimal config
    {
      id: "aws-vpc-minimal",
      name: "MinimalVPC",
      resource_type: "aws-vpc",
      node_type: "aws_container",
      configuration: {},
    },
    // Resource with aliased type
    {
      id: "aws-instance-aliased",
      name: "AliasedInstance",
      resource_type: "instance", // Should normalize to ec2
      node_type: "aws_service",
      configuration: {},
    },
    // Resource with uppercase type
    {
      id: "aws-bucket-upper",
      name: "UppercaseBucket",
      resource_type: "AWS-S3-BUCKET", // Should normalize
      node_type: "aws_service",
      configuration: {},
    },
    // Subnet without explicit type
    {
      id: "aws-subnet-generic",
      name: "GenericSubnet",
      resource_type: "aws-subnet",
      node_type: "aws_container",
      parent_id: "aws-vpc-minimal",
      configuration: {
        cidr_block: "10.0.0.0/24",
      },
    },
  ],
  connections: [],
};

// Architecture with camelCase (frontend might send this)
const camelCaseArchitecture = {
  metadata: {
    name: "camel-case-test",
    provider: "aws",
    region: "us-west-2",
    createdAt: "2025-01-30T00:00:00.000Z", // camelCase
    lastModified: "2025-01-30T00:00:00.000Z", // camelCase
  },
  resources: [
    {
      id: "aws-vpc-camel",
      name: "CamelVPC",
      resourceType: "aws-vpc", // camelCase
      nodeType: "aws_container", // camelCase
      parentId: null, // camelCase
      configuration: {
        cidrBlock: "10.0.0.0/16", // camelCase - should this work?
      },
    },
  ],
  connections: [
    {
      id: "edge-1",
      sourceId: "aws-vpc-camel", // camelCase
      targetId: "aws-subnet-camel", // camelCase
      sourceHandle: "bottom",
      targetHandle: "top",
    },
  ],
};

// ============================================================================
// TEST SUITES
// ============================================================================

async function runNormalizationTests() {
  console.log("\n📋 Normalization Tests\n");

  await test("should normalize minimal architecture", async () => {
    const result = await ArchitectureNormalizerService.normalizeArchitecture(
      minimalArchitecture,
      "test-project"
    );
    expect(result.errors).toHaveLength(0);
    expect(result.architecture.resources).toHaveLength(1);
    expect(result.architecture.resources[0].terraformModule).toBe("networking/vpc");
  })();

  await test("should normalize standard architecture with hierarchy", async () => {
    const result = await ArchitectureNormalizerService.normalizeArchitecture(
      standardArchitecture,
      "test-project"
    );
    expect(result.errors).toHaveLength(0);
    expect(result.architecture.resources).toHaveLength(3);

    // Check VPC
    const vpc = result.architecture.resources.find(r => r.id === "aws-vpc-lxys3o");
    expect(vpc?.terraformModule).toBe("networking/vpc");

    // Check Subnet
    const subnet = result.architecture.resources.find(r => r.id === "aws-subnet-bg9i1u");
    expect(subnet?.terraformModule).toBe("networking/subnet");
    expect(subnet?.parentId).toBe("aws-vpc-lxys3o");

    // Check EC2
    const ec2 = result.architecture.resources.find(r => r.id === "aws-ec2-qlqfpt");
    expect(ec2?.terraformModule).toBe("compute/ec2");
  })();

  await test("should resolve node IDs to module references", async () => {
    const result = await ArchitectureNormalizerService.normalizeArchitecture(
      standardArchitecture,
      "test-project"
    );

    const subnet = result.architecture.resources.find(r => r.id === "aws-subnet-bg9i1u");
    expect(subnet?.configuration.vpc_id).toMatch(/^module\./);

    const ec2 = result.architecture.resources.find(r => r.id === "aws-ec2-qlqfpt");
    expect(ec2?.configuration.subnet_id).toMatch(/^module\./);
  })();

  await test("should normalize complex architecture with all resource types", async () => {
    const result = await ArchitectureNormalizerService.normalizeArchitecture(
      complexArchitecture,
      "test-project"
    );
    expect(result.errors).toHaveLength(0);
    expect(result.architecture.resources.length).toBeGreaterThan(5);

    // Check various module mappings
    const modules = new Set(result.architecture.resources.map(r => r.terraformModule));
    expect(modules.has("networking/vpc")).toBeTruthy();
    expect(modules.has("networking/subnet")).toBeTruthy();
    expect(modules.has("networking/internet-gateway")).toBeTruthy();
    expect(modules.has("networking/nat-gateway")).toBeTruthy();
    expect(modules.has("networking/route-table")).toBeTruthy();
    expect(modules.has("compute/ec2")).toBeTruthy();
    expect(modules.has("security/security-group")).toBeTruthy();
    expect(modules.has("storage/s3")).toBeTruthy();
  })();

  await test("should handle edge cases and aliases", async () => {
    const result = await ArchitectureNormalizerService.normalizeArchitecture(
      edgeCaseArchitecture,
      "test-project"
    );

    // instance → ec2
    const ec2 = result.architecture.resources.find(r => r.id === "aws-instance-aliased");
    expect(ec2?.terraformModule).toBe("compute/ec2");

    // AWS-S3-BUCKET → s3
    const s3 = result.architecture.resources.find(r => r.id === "aws-bucket-upper");
    expect(s3?.terraformModule).toBe("storage/s3");

    // aws-subnet → subnet
    const subnet = result.architecture.resources.find(r => r.id === "aws-subnet-generic");
    expect(subnet?.terraformModule).toBe("networking/subnet");
  })();

  await test("should build correct dependency order", async () => {
    const result = await ArchitectureNormalizerService.normalizeArchitecture(
      standardArchitecture,
      "test-project"
    );

    const order = result.architecture.dependencyOrder;
    const vpcIndex = order.indexOf("aws-vpc-lxys3o");
    const subnetIndex = order.indexOf("aws-subnet-bg9i1u");
    const ec2Index = order.indexOf("aws-ec2-qlqfpt");

    // VPC should come before subnet, subnet before EC2
    expect(vpcIndex < subnetIndex).toBeTruthy();
    expect(subnetIndex < ec2Index).toBeTruthy();
  })();

  await test("should disable subnet route table when RouteTable exists", async () => {
    const result = await ArchitectureNormalizerService.normalizeArchitecture(
      complexArchitecture,
      "test-project"
    );

    const subnets = result.architecture.resources.filter(
      r => r.terraformModule === "networking/subnet"
    );

    for (const subnet of subnets) {
      expect(subnet.configuration.create_route_table).toBe(false);
      expect(subnet.configuration.create_igw_route).toBe(false);
      expect(subnet.configuration.create_nat_route).toBe(false);
    }
  })();

  await test("should auto-populate RouteTable routes and associations", async () => {
    const result = await ArchitectureNormalizerService.normalizeArchitecture(
      complexArchitecture,
      "test-project"
    );

    const routeTable = result.architecture.resources.find(
      r => r.terraformModule === "networking/route-table"
    );

    expect(routeTable).toBeTruthy();
    expect(routeTable?.configuration.routes).toBeTruthy();
    expect(routeTable?.configuration.routes.internet).toBeTruthy();
    expect(routeTable?.configuration.routes.internet.gateway_id).toMatch(/^module\./);
  })();
}

async function runGenerationTests() {
  console.log("\n🔧 Terraform Generation Tests\n");

  await test("should generate valid Terraform for minimal architecture", async () => {
    const normResult = await ArchitectureNormalizerService.normalizeArchitecture(
      minimalArchitecture,
      "test-project"
    );
    const tfResult = await SimplifiedTerraformGeneratorService.generateTerraformConfiguration(
      normResult.architecture,
      "test-project"
    );

    expect(tfResult.mainTf).toContain('module "vpc_abc123"');
    expect(tfResult.mainTf).toContain('source = "../../../../data/terraform-modules/networking/vpc"');
    expect(tfResult.mainTf).toContain('cidr_block');
  })();

  await test("should generate module references in Terraform", async () => {
    const normResult = await ArchitectureNormalizerService.normalizeArchitecture(
      standardArchitecture,
      "test-project"
    );
    const tfResult = await SimplifiedTerraformGeneratorService.generateTerraformConfiguration(
      normResult.architecture,
      "test-project"
    );

    // Check that vpc_id is a module reference, not a quoted string
    expect(tfResult.mainTf).toContain("vpc_id");
    expect(tfResult.mainTf).toContain("module.");

    // Check that vpc_id and subnet_id assignments use module references
    // They should appear as: vpc_id = module.xxx.vpc_id (unquoted)
    // NOT as: vpc_id = "aws-vpc-lxys3o" (quoted node ID)
    const vpcIdAssignments = tfResult.mainTf.match(/vpc_id\s*=\s*[^\n]+/g) || [];
    for (const assignment of vpcIdAssignments) {
      // Skip if it's a module output or tags block
      if (assignment.includes("module.") || assignment.includes("{")) continue;
      // Should not have quoted node ID
      expect(assignment).not.toContain('"aws-vpc-');
    }
  })();

  await test("should generate depends_on blocks", async () => {
    const normResult = await ArchitectureNormalizerService.normalizeArchitecture(
      standardArchitecture,
      "test-project"
    );
    const tfResult = await SimplifiedTerraformGeneratorService.generateTerraformConfiguration(
      normResult.architecture,
      "test-project"
    );

    expect(tfResult.mainTf).toContain("depends_on");
  })();

  await test("should generate all required files", async () => {
    const normResult = await ArchitectureNormalizerService.normalizeArchitecture(
      complexArchitecture,
      "test-project"
    );
    const tfResult = await SimplifiedTerraformGeneratorService.generateTerraformConfiguration(
      normResult.architecture,
      "test-project"
    );

    expect(tfResult.files.length).toBe(5);
    const filenames = tfResult.files.map(f => f.filename);
    expect(filenames).toContain("main.tf");
    expect(filenames).toContain("variables.tf");
    expect(filenames).toContain("outputs.tf");
    expect(filenames).toContain("terraform.tfvars");
    expect(filenames).toContain("providers.tf");
  })();

  await test("should generate categorized outputs", async () => {
    const normResult = await ArchitectureNormalizerService.normalizeArchitecture(
      complexArchitecture,
      "test-project"
    );
    const tfResult = await SimplifiedTerraformGeneratorService.generateTerraformConfiguration(
      normResult.architecture,
      "test-project"
    );

    expect(tfResult.outputsTf).toContain("NETWORKING OUTPUTS");
    expect(tfResult.outputsTf).toContain("COMPUTE OUTPUTS");
    expect(tfResult.outputsTf).toContain("SECURITY OUTPUTS");
    expect(tfResult.outputsTf).toContain("STORAGE OUTPUTS");
  })();

  await test("should validate generated Terraform syntax", async () => {
    const normResult = await ArchitectureNormalizerService.normalizeArchitecture(
      complexArchitecture,
      "test-project"
    );
    const tfResult = await SimplifiedTerraformGeneratorService.generateTerraformConfiguration(
      normResult.architecture,
      "test-project"
    );

    // Check providers.tf syntax (has terraform/provider blocks)
    const providersValidation = SimplifiedTerraformGeneratorService.validateTerraformSyntax(
      tfResult.providersVersionsTf
    );
    expect(providersValidation.valid).toBeTruthy();

    // For main.tf, just check brace matching (no terraform/provider blocks expected)
    const openBraces = (tfResult.mainTf.match(/\{/g) || []).length;
    const closeBraces = (tfResult.mainTf.match(/\}/g) || []).length;
    expect(openBraces).toBe(closeBraces);

    // Check module names are valid identifiers (no hyphens)
    const moduleNames = tfResult.mainTf.match(/module "[^"]+"/g) || [];
    for (const moduleName of moduleNames) {
      // Extract name between quotes
      const name = moduleName.replace(/module "|"/g, "");
      // Should only contain lowercase letters, numbers, underscores
      expect(name).toMatch(/^[a-z0-9_]+$/);
    }
  })();
}

async function runEdgeCaseTests() {
  console.log("\n⚠️ Edge Case Tests\n");

  await test("should handle empty resources array", async () => {
    const emptyArch = {
      metadata: { name: "empty", provider: "aws" },
      resources: [],
      connections: [],
    };
    const result = await ArchitectureNormalizerService.normalizeArchitecture(
      emptyArch,
      "test-project"
    );
    expect(result.errors).toHaveLength(0);
    expect(result.architecture.resources).toHaveLength(0);
  })();

  await test("should handle missing optional fields", async () => {
    const minimalResource = {
      metadata: { provider: "aws" },
      resources: [
        {
          id: "aws-vpc-min",
          resource_type: "aws-vpc",
          node_type: "aws_container",
          configuration: { cidr_block: "10.0.0.0/16" },
        },
      ],
      connections: [],
    };
    const result = await ArchitectureNormalizerService.normalizeArchitecture(
      minimalResource as any,
      "test-project"
    );
    expect(result.errors).toHaveLength(0);
  })();

  await test("should handle connections with missing source/target", async () => {
    const archWithBadConnections = {
      metadata: { provider: "aws" },
      resources: [
        {
          id: "aws-vpc-conn",
          resource_type: "aws-vpc",
          node_type: "aws_container",
          configuration: { cidr_block: "10.0.0.0/16" },
        },
      ],
      connections: [
        {
          id: "bad-edge",
          source: "aws-vpc-conn",
          target: "nonexistent-node", // This node doesn't exist
        },
      ],
    };
    const result = await ArchitectureNormalizerService.normalizeArchitecture(
      archWithBadConnections as any,
      "test-project"
    );
    // Should have warning but not fail
    expect(result.warnings.length).toBeGreaterThan(0);
  })();

  await test("should handle circular parent references gracefully", async () => {
    // This shouldn't happen in practice but backend should handle it
    const circularArch = {
      metadata: { provider: "aws" },
      resources: [
        {
          id: "aws-vpc-a",
          resource_type: "aws-vpc",
          node_type: "aws_container",
          parent_id: "aws-vpc-b", // Circular!
          configuration: { cidr_block: "10.0.0.0/16" },
        },
        {
          id: "aws-vpc-b",
          resource_type: "aws-vpc",
          node_type: "aws_container",
          parent_id: "aws-vpc-a", // Circular!
          configuration: { cidr_block: "10.1.0.0/16" },
        },
      ],
      connections: [],
    };
    // Should not throw, should handle gracefully
    const result = await ArchitectureNormalizerService.normalizeArchitecture(
      circularArch as any,
      "test-project"
    );
    // Result may have warnings or validation errors for circular deps
    expect(result).toBeTruthy();
  })();

  await test("should handle very long resource names", async () => {
    const longName = "a".repeat(200);
    const archWithLongName = {
      metadata: { provider: "aws" },
      resources: [
        {
          id: "aws-vpc-long",
          name: longName,
          resource_type: "aws-vpc",
          node_type: "aws_container",
          configuration: { cidr_block: "10.0.0.0/16" },
        },
      ],
      connections: [],
    };
    const result = await ArchitectureNormalizerService.normalizeArchitecture(
      archWithLongName as any,
      "test-project"
    );
    expect(result.errors).toHaveLength(0);
    // Module name should be sanitized
    expect(result.architecture.resources[0].moduleName.length).toBeGreaterThan(0);
  })();

  await test("should handle special characters in names", async () => {
    const archWithSpecialChars = {
      metadata: { provider: "aws" },
      resources: [
        {
          id: "aws-vpc-special",
          name: "My VPC (test) - 123!@#",
          resource_type: "aws-vpc",
          node_type: "aws_container",
          configuration: { cidr_block: "10.0.0.0/16" },
        },
      ],
      connections: [],
    };
    const result = await ArchitectureNormalizerService.normalizeArchitecture(
      archWithSpecialChars as any,
      "test-project"
    );
    expect(result.errors).toHaveLength(0);
    // Module name should be sanitized (no special chars)
    expect(result.architecture.resources[0].moduleName).toMatch(/^[a-z0-9_]+$/);
  })();
}

async function runIntegrationTests() {
  console.log("\n🔄 Full Integration Tests\n");

  await test("should process complex architecture end-to-end", async () => {
    // Normalize
    const normResult = await ArchitectureNormalizerService.normalizeArchitecture(
      complexArchitecture as any,
      "integration-test"
    );
    expect(normResult.errors).toHaveLength(0);
    expect(normResult.architecture.validation.valid).toBeTruthy();

    // Generate Terraform
    const tfResult = await SimplifiedTerraformGeneratorService.generateTerraformConfiguration(
      normResult.architecture,
      "integration-test"
    );

    // Validate providers.tf syntax (has terraform/provider blocks)
    const providersValidation = SimplifiedTerraformGeneratorService.validateTerraformSyntax(
      tfResult.providersVersionsTf
    );
    expect(providersValidation.valid).toBeTruthy();

    // Check brace matching in main.tf
    const openBraces = (tfResult.mainTf.match(/\{/g) || []).length;
    const closeBraces = (tfResult.mainTf.match(/\}/g) || []).length;
    expect(openBraces).toBe(closeBraces);

    // Check key modules are represented (normalized names)
    expect(tfResult.mainTf).toContain('module "mainvpc_');
    expect(tfResult.mainTf).toContain('module "internetgateway_');
    expect(tfResult.mainTf).toContain('module "publicroutetable_');
    expect(tfResult.mainTf).toContain('module "publicsubnet1_');
    expect(tfResult.mainTf).toContain('module "privatesubnet1_');
    expect(tfResult.mainTf).toContain('module "natgateway_');
    expect(tfResult.mainTf).toContain('module "websecuritygroup_');
    expect(tfResult.mainTf).toContain('module "webserver1_');
    expect(tfResult.mainTf).toContain('module "assetsbucket_');
  })();

  await test("should handle real-world-like architecture", async () => {
    // Simulate a typical 3-tier architecture
    const realWorldArch = {
      metadata: {
        name: "three-tier-app",
        provider: "aws",
        region: "us-east-1",
        environment: "production",
      },
      resources: [
        // VPC
        { id: "aws-vpc-prod", name: "ProdVPC", resource_type: "aws-vpc", node_type: "aws_container", configuration: { cidr_block: "10.0.0.0/16" } },
        // Public subnet for load balancer
        { id: "aws-subnet-pub-a", name: "PublicA", resource_type: "aws-public-subnet", node_type: "aws_container", parent_id: "aws-vpc-prod", configuration: { cidr_block: "10.0.1.0/24", availability_zone: "us-east-1a", vpc_id: "aws-vpc-prod" } },
        { id: "aws-subnet-pub-b", name: "PublicB", resource_type: "aws-public-subnet", node_type: "aws_container", parent_id: "aws-vpc-prod", configuration: { cidr_block: "10.0.2.0/24", availability_zone: "us-east-1b", vpc_id: "aws-vpc-prod" } },
        // Private subnet for application
        { id: "aws-subnet-priv-a", name: "PrivateA", resource_type: "aws-private-subnet", node_type: "aws_container", parent_id: "aws-vpc-prod", configuration: { cidr_block: "10.0.3.0/24", availability_zone: "us-east-1a", vpc_id: "aws-vpc-prod" } },
        { id: "aws-subnet-priv-b", name: "PrivateB", resource_type: "aws-private-subnet", node_type: "aws_container", parent_id: "aws-vpc-prod", configuration: { cidr_block: "10.0.4.0/24", availability_zone: "us-east-1b", vpc_id: "aws-vpc-prod" } },
        // Security groups
        { id: "aws-sg-web", name: "WebSG", resource_type: "aws-security-group", node_type: "aws_container", configuration: { name: "web-sg", vpc_id: "aws-vpc-prod" } },
        { id: "aws-sg-app", name: "AppSG", resource_type: "aws-security-group", node_type: "aws_container", configuration: { name: "app-sg", vpc_id: "aws-vpc-prod" } },
        // EC2 instances
        { id: "aws-ec2-app1", name: "AppServer1", resource_type: "aws-ec2", node_type: "aws_service", configuration: { instance_type: "t3.medium", subnet_id: "aws-subnet-priv-a", security_groups: ["aws-sg-app"] } },
        { id: "aws-ec2-app2", name: "AppServer2", resource_type: "aws-ec2", node_type: "aws_service", configuration: { instance_type: "t3.medium", subnet_id: "aws-subnet-priv-b", security_groups: ["aws-sg-app"] } },
      ],
      connections: [],
    };

    const normResult = await ArchitectureNormalizerService.normalizeArchitecture(
      realWorldArch as any,
      "real-world-test"
    );
    expect(normResult.errors).toHaveLength(0);

    const tfResult = await SimplifiedTerraformGeneratorService.generateTerraformConfiguration(
      normResult.architecture,
      "real-world-test"
    );

    // Should have all resources
    expect(normResult.architecture.resources.length).toBe(9);

    // Verify cross-references resolved
    const appServer = normResult.architecture.resources.find(r => r.id === "aws-ec2-app1");
    expect(appServer?.configuration.subnet_id).toMatch(/^module\./);
    expect(appServer?.configuration.security_group_ids?.[0]).toMatch(/^module\./);

    // Validate providers.tf syntax
    const validation = SimplifiedTerraformGeneratorService.validateTerraformSyntax(tfResult.providersVersionsTf);
    expect(validation.valid).toBeTruthy();

    // Check brace matching in main.tf
    const openBraces = (tfResult.mainTf.match(/\{/g) || []).length;
    const closeBraces = (tfResult.mainTf.match(/\}/g) || []).length;
    expect(openBraces).toBe(closeBraces);
  })();
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║     Architecture JSON Validation Tests                         ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  await runNormalizationTests();
  await runGenerationTests();
  await runEdgeCaseTests();
  await runIntegrationTests();

  // Summary
  console.log("\n" + "═".repeat(60));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${results.length} tests`);

  if (failed > 0) {
    console.log("\n❌ Failed tests:");
    for (const result of results.filter(r => !r.passed)) {
      console.log(`  - ${result.name}: ${result.error}`);
    }
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed!");
    process.exit(0);
  }
}

main().catch(console.error);
