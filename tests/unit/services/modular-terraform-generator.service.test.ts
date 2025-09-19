import { describe, it, expect, beforeEach } from '@jest/globals';
import { ModularTerraformGeneratorService, TerraformGenerationResult } from '../../../src/services/ModularTerraformGeneratorService';
import { ModuleMappingResult } from '../../../src/services/ModuleMapperService';
import { GeneratedModule } from '../../../src/models/TerraformModule';
import { ArchitectureMetadata } from '../../../src/services/ArchitectureParserService';

describe('ModularTerraformGeneratorService', () => {
  let mockMappingResult: ModuleMappingResult;
  let mockMetadata: ArchitectureMetadata;

  beforeEach(() => {
    // Create mock data for testing
    mockMetadata = {
      provider: 'aws',
      region: 'us-east-1',
      environment: 'development',
      project: 'test-project',
      version: '1.0.0',
      tags: {
        Environment: 'development',
        Project: 'test-project',
        ManagedBy: 'Darch'
      }
    };

    const mockModules: GeneratedModule[] = [
      {
        name: 'vpc',
        source: 'src/data/terraform-modules/networking/vpc',
        variables: {
          cidr_block: '10.0.0.0/16',
          enable_dns_hostnames: true,
          enable_dns_support: true
        },
        outputs: {
          vpc_id: 'aws_vpc.main.id',
          vpc_arn: 'aws_vpc.main.arn',
          cidr_block: 'aws_vpc.main.cidr_block'
        }
      },
      {
        name: 'subnet',
        source: 'src/data/terraform-modules/networking/subnet',
        variables: {
          vpc_id: 'module.vpc.vpc_id',
          cidr_block: '10.0.1.0/24',
          availability_zone: 'us-east-1a'
        },
        outputs: {
          subnet_id: 'aws_subnet.main.id',
          subnet_arn: 'aws_subnet.main.arn'
        }
      }
    ];

    mockMappingResult = {
      modules: mockModules,
      dependencies: [
        {
          moduleId: 'subnet',
          dependsOn: ['vpc'],
          level: 1
        }
      ],
      errors: [],
      warnings: [],
      nodes: [
        {
          id: 'vpc-1',
          resourceType: 'aws-vpc',
          name: 'vpc',
          nodeType: 'awsService',
          configuration: { cidr_block: '10.0.0.0/16' },
          position: { x: 0, y: 0 },
          dimensions: { width: 100, height: 50 },
          children: ['subnet-1'],
          dependencies: [],
          terraformModule: 'networking/vpc'
        },
        {
          id: 'subnet-1',
          resourceType: 'aws-subnet',
          name: 'subnet',
          nodeType: 'awsService',
          configuration: { cidr_block: '10.0.1.0/24' },
          position: { x: 0, y: 100 },
          dimensions: { width: 100, height: 50 },
          children: [],
          dependencies: ['vpc-1'],
          terraformModule: 'networking/subnet'
        }
      ]
    };
  });

  describe('generateTerraformConfiguration', () => {
    it('should generate complete Terraform configuration', () => {
      const result: TerraformGenerationResult = ModularTerraformGeneratorService.generateTerraformConfiguration(
        mockMappingResult,
        mockMetadata,
        'test-infrastructure'
      );

      expect(result).toBeDefined();
      expect(result.mainTf).toBeDefined();
      expect(result.variablesTf).toBeDefined();
      expect(result.outputsTf).toBeDefined();
      expect(result.terraformTfvars).toBeDefined();
      expect(result.providersVersionsTf).toBeDefined();
      expect(result.files).toHaveLength(5);

      // Verify file structure
      const fileNames = result.files.map(f => f.filename);
      expect(fileNames).toContain('main.tf');
      expect(fileNames).toContain('variables.tf');
      expect(fileNames).toContain('outputs.tf');
      expect(fileNames).toContain('terraform.tfvars');
      expect(fileNames).toContain('providers.tf');
    });

    it('should generate main.tf with module definitions', () => {
      const result: TerraformGenerationResult = ModularTerraformGeneratorService.generateTerraformConfiguration(
        mockMappingResult,
        mockMetadata
      );

      expect(result.mainTf).toContain('module "vpc"');
      expect(result.mainTf).toContain('module "subnet"');
      expect(result.mainTf).toContain('source = "./modules/networking/vpc"');
      expect(result.mainTf).toContain('source = "./modules/networking/subnet"');
      expect(result.mainTf).toContain('cidr_block = var.vpc_cidr_block');
    });

    it('should generate variables.tf with proper variable definitions', () => {
      const result: TerraformGenerationResult = ModularTerraformGeneratorService.generateTerraformConfiguration(
        mockMappingResult,
        mockMetadata
      );

      expect(result.variablesTf).toContain('variable "vpc_cidr_block"');
      expect(result.variablesTf).toContain('variable "subnet_cidr_block"');
      expect(result.variablesTf).toContain('type = string');
      expect(result.variablesTf).toContain('description = ');
    });

    it('should generate outputs.tf with module outputs', () => {
      const result: TerraformGenerationResult = ModularTerraformGeneratorService.generateTerraformConfiguration(
        mockMappingResult,
        mockMetadata
      );

      expect(result.outputsTf).toContain('output "vpc_vpc_id"');
      expect(result.outputsTf).toContain('output "subnet_subnet_id"');
      expect(result.outputsTf).toContain('value = module.vpc.vpc_id');
      expect(result.outputsTf).toContain('value = module.subnet.subnet_id');
    });

    it('should generate terraform.tfvars with variable values', () => {
      const result: TerraformGenerationResult = ModularTerraformGeneratorService.generateTerraformConfiguration(
        mockMappingResult,
        mockMetadata
      );

      expect(result.terraformTfvars).toContain('vpc_cidr_block = "10.0.0.0/16"');
      expect(result.terraformTfvars).toContain('subnet_cidr_block = "10.0.1.0/24"');
      expect(result.terraformTfvars).toContain('environment = "development"');
      expect(result.terraformTfvars).toContain('project = "test-project"');
    });

    it('should generate providers.tf with correct provider versions', () => {
      const result: TerraformGenerationResult = ModularTerraformGeneratorService.generateTerraformConfiguration(
        mockMappingResult,
        mockMetadata
      );

      expect(result.providersVersionsTf).toContain('terraform {');
      expect(result.providersVersionsTf).toContain('required_providers {');
      expect(result.providersVersionsTf).toContain('aws = {');
      expect(result.providersVersionsTf).toContain('source = "hashicorp/aws"');
      expect(result.providersVersionsTf).toContain('provider "aws" {');
      expect(result.providersVersionsTf).toContain('region = "us-east-1"');
    });
  });

  describe('Cross-module references', () => {
    it('should handle VPC dependencies correctly', () => {
      const result: TerraformGenerationResult = ModularTerraformGeneratorService.generateTerraformConfiguration(
        mockMappingResult,
        mockMetadata
      );

      // Should reference vpc module output in subnet configuration
      expect(result.mainTf).toContain('vpc_id = module.vpc.vpc_id');
    });

    it('should resolve dependencies between modules', () => {
      // Add internet gateway that depends on VPC
      const igwModule: GeneratedModule = {
        name: 'igw',
        source: 'src/data/terraform-modules/networking/internet-gateway',
        variables: {
          vpc_id: 'module.vpc.vpc_id'
        },
        outputs: {
          igw_id: 'aws_internet_gateway.main.id'
        }
      };

      mockMappingResult.modules.push(igwModule);

      const result: TerraformGenerationResult = ModularTerraformGeneratorService.generateTerraformConfiguration(
        mockMappingResult,
        mockMetadata
      );

      expect(result.mainTf).toContain('module "igw"');
      expect(result.mainTf).toContain('vpc_id = module.vpc.vpc_id');
    });
  });

  describe('validateTerraformSyntax', () => {
    it('should validate correct Terraform syntax', () => {
      const validTerraform = `
        resource "aws_vpc" "main" {
          cidr_block = "10.0.0.0/16"
          
          tags = {
            Name = "main"
          }
        }
      `;

      const result = ModularTerraformGeneratorService.validateTerraformSyntax(validTerraform);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect syntax errors', () => {
      const invalidTerraform = `
        resource "aws_vpc" "main" {
          cidr_block = "10.0.0.0/16"
          // Missing closing brace
      `;

      const result = ModularTerraformGeneratorService.validateTerraformSyntax(invalidTerraform);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect unmatched quotes', () => {
      const invalidTerraform = `
        resource "aws_vpc" "main" {
          cidr_block = "10.0.0.0/16
          tags = {
            Name = "main"
          }
        }
      `;

      const result = ModularTerraformGeneratorService.validateTerraformSyntax(invalidTerraform);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('quote'))).toBe(true);
    });

    it('should detect unmatched braces', () => {
      const invalidTerraform = `
        resource "aws_vpc" "main" {
          cidr_block = "10.0.0.0/16"
          tags = {
            Name = "main"
          }
          // Missing closing brace for resource
      `;

      const result = ModularTerraformGeneratorService.validateTerraformSyntax(invalidTerraform);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('brace'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty module list', () => {
      const emptyMappingResult: ModuleMappingResult = {
        modules: [],
        dependencies: [],
        nodes: [],
        errors: [],
        warnings: []
      };

      const result: TerraformGenerationResult = ModularTerraformGeneratorService.generateTerraformConfiguration(
        emptyMappingResult,
        mockMetadata
      );

      expect(result).toBeDefined();
      expect(result.mainTf).toBeDefined();
      expect(result.variablesTf).toBeDefined();
      expect(result.outputsTf).toBeDefined();
      expect(result.files).toHaveLength(5);
    });

    it('should handle modules without variables', () => {
      const moduleWithoutVars: GeneratedModule = {
        name: 'simple',
        source: 'src/data/terraform-modules/compute/ec2',
        variables: {},
        outputs: {
          instance_id: 'aws_instance.main.id'
        }
      };

      const simpleMappingResult: ModuleMappingResult = {
        modules: [moduleWithoutVars],
        dependencies: [],
        errors: [],
        warnings: [],
        nodes: [{
          id: 'instance-1',
          resourceType: 'aws-instance',
          name: 'instance',
          nodeType: 'awsService',
          configuration: {},
          position: { x: 0, y: 0 },
          dimensions: { width: 100, height: 50 },
          children: [],
          dependencies: [],
          terraformModule: 'compute/ec2'
        }]
      };

      const result: TerraformGenerationResult = ModularTerraformGeneratorService.generateTerraformConfiguration(
        simpleMappingResult,
        mockMetadata
      );

      expect(result.mainTf).toContain('module "simple"');
      expect(result.outputsTf).toContain('output "simple_instance_id"');
    });

    it('should handle modules with complex variable types', () => {
      const complexModule: GeneratedModule = {
        name: 'complex',
        source: 'src/data/terraform-modules/security/security-group',
        variables: {
          ingress_rules: [
            {
              from_port: 80,
              to_port: 80,
              protocol: 'tcp',
              cidr_blocks: ['0.0.0.0/0']
            }
          ],
          tags: {
            Environment: 'dev',
            Team: 'platform'
          }
        },
        outputs: {
          sg_id: 'aws_security_group.main.id'
        }
      };

      const complexMappingResult: ModuleMappingResult = {
        modules: [complexModule],
        dependencies: [],
        errors: [],
        warnings: [],
        nodes: [{
          id: 'sg-1',
          resourceType: 'aws-security-group',
          name: 'sg',
          nodeType: 'awsService',
          configuration: complexModule.variables,
          position: { x: 0, y: 0 },
          dimensions: { width: 100, height: 50 },
          children: [],
          dependencies: [],
          terraformModule: 'security/security-group'
        }]
      };

      const result: TerraformGenerationResult = ModularTerraformGeneratorService.generateTerraformConfiguration(
        complexMappingResult,
        mockMetadata
      );

      expect(result.variablesTf).toContain('variable "complex_ingress_rules"');
      expect(result.terraformTfvars).toContain('complex_ingress_rules = [');
      expect(result.terraformTfvars).toContain('from_port = 80');
    });
  });

  describe('Provider Support', () => {
    it('should handle different providers', () => {
      const azureMetadata: ArchitectureMetadata = {
        ...mockMetadata,
        provider: 'azure',
        region: 'East US'
      };

      const result: TerraformGenerationResult = ModularTerraformGeneratorService.generateTerraformConfiguration(
        mockMappingResult,
        azureMetadata
      );

      // Should adapt provider configuration
      expect(result.providersVersionsTf).toContain('azurerm = {');
      expect(result.providersVersionsTf).toContain('source = "hashicorp/azurerm"');
    });
  });
});
