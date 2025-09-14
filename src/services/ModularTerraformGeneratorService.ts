import { GeneratedModule } from '../models/TerraformModule.js';
import { ModuleDependency, ModuleMappingResult } from './ModuleMapperService.js';
import { ArchitectureMetadata } from './ArchitectureParserService.js';
import { logger, LogCategory, LogLevel } from '../utils/Logger.js';

export interface TerraformGenerationResult {
  mainTf: string;
  variablesTf: string;
  outputsTf: string;
  terraformTfvars: string;
  providersVersionsTf: string;
  files: TerraformFile[];
}

export interface TerraformFile {
  filename: string;
  content: string;
  description: string;
}

export class ModularTerraformGeneratorService {

  /**
   * Generate complete Terraform configuration from modules
   */
  static generateTerraformConfiguration(
    mappingResult: ModuleMappingResult,
    metadata: ArchitectureMetadata,
    projectName: string = 'infrastructure'
  ): TerraformGenerationResult {
    logger.terraform(LogLevel.INFO, '🔄 Generating modular Terraform configuration', {
      projectName,
      moduleCount: mappingResult.modules.length,
      dependencyCount: mappingResult.dependencies.length,
      provider: metadata.provider,
      component: 'ModularTerraformGeneratorService',
      operation: 'generateTerraformConfiguration'
    });

    const mainTf = this.generateMainTf(mappingResult.modules, mappingResult.dependencies, metadata, mappingResult.nodes);
    const variablesTf = this.generateVariablesTf(mappingResult.modules, metadata);
    const outputsTf = this.generateOutputsTf(mappingResult.modules);
    const terraformTfvars = this.generateTerraformTfvars(mappingResult.modules, metadata);
    const providersVersionsTf = this.generateProvidersVersionsTf(metadata);

    const files: TerraformFile[] = [
      {
        filename: 'main.tf',
        content: mainTf,
        description: 'Main Terraform configuration with module definitions'
      },
      {
        filename: 'variables.tf',
        content: variablesTf,
        description: 'Input variables for the Terraform configuration'
      },
      {
        filename: 'outputs.tf',
        content: outputsTf,
        description: 'Output values from the Terraform configuration'
      },
      {
        filename: 'terraform.tfvars',
        content: terraformTfvars,
        description: 'Variable values for the Terraform configuration'
      },
      {
        filename: 'providers.tf',
        content: providersVersionsTf,
        description: 'Provider and version constraints'
      }
    ];

    logger.terraform(LogLevel.INFO, '✅ Generated Terraform configuration with modules', {
      projectName,
      filesGenerated: files.length,
      totalLinesGenerated: files.reduce((sum, file) => sum + file.content.split('\n').length, 0),
      component: 'ModularTerraformGeneratorService',
      operation: 'generateTerraformConfiguration'
    });

    return {
      mainTf,
      variablesTf,
      outputsTf,
      terraformTfvars,
      providersVersionsTf,
      files
    };
  }

  /**
   * Generate main.tf with module definitions
   */
  private static generateMainTf(
    modules: GeneratedModule[],
    dependencies: ModuleDependency[],
    metadata: ArchitectureMetadata,
    nodes: any[] = []
  ): string {
    const dependencyMap = new Map(dependencies.map(d => [d.moduleId, d]));

    // Sort modules by dependency level
    const sortedModules = modules.sort((a, b) => {
      const aLevel = dependencyMap.get(a.name)?.level || 0;
      const bLevel = dependencyMap.get(b.name)?.level || 0;
      return aLevel - bLevel;
    });

    let content = this.generateFileHeader('Main Terraform configuration');

    // Add locals block for common values
    content += this.generateLocalsBlock(metadata);
    content += '\n';

    // Generate module blocks
    for (const module of sortedModules) {
      content += this.generateModuleBlock(module, dependencyMap, modules, nodes);
      content += '\n';
    }

    return content;
  }

  /**
   * Generate locals block
   */
  private static generateLocalsBlock(metadata: ArchitectureMetadata): string {
    return `
locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    CreatedBy   = "Darch"
    Region      = var.aws_region
  }

  name_prefix = "\${var.project_name}-\${var.environment}"
}
`;
  }

  /**
   * Generate module block
   */
  private static generateModuleBlock(
    module: GeneratedModule,
    dependencyMap: Map<string, ModuleDependency>,
    allModules: GeneratedModule[],
    nodes: any[]
  ): string {
    let block = `module "${module.name}" {\n`;
    block += `  source = "${module.source}"\n\n`;

    // Add variables with cross-reference resolution
    const sortedVars = Object.entries(module.variables).sort(([a], [b]) => a.localeCompare(b));
    for (const [key, value] of sortedVars) {
      let resolvedValue = value;
      
      // Resolve cross-module references for null values
      if (value === null) {
        resolvedValue = this.resolveCrossModuleReference(key, module, allModules, nodes);
      }
      
      const formattedValue = this.formatTerraformValue(resolvedValue);
      block += `  ${key.padEnd(20)} = ${formattedValue}\n`;
    }

    // Add dependencies if any
    const dependency = dependencyMap.get(module.name);
    if (dependency && dependency.dependsOn.length > 0) {
      block += '\n  depends_on = [\n';
      for (const dep of dependency.dependsOn) {
        block += `    module.${dep},\n`;
      }
      block += '  ]\n';
    }

    block += '}\n';
    return block;
  }

  /**
   * Resolve cross-module references for variables with null values
   */
  private static resolveCrossModuleReference(
    variableName: string, 
    currentModule: GeneratedModule, 
    allModules: GeneratedModule[], 
    nodes: any[]
  ): string | null {
    // Find the current node that corresponds to this module
    const currentNode = nodes.find(node => {
      const moduleName = this.generateModuleName(node);
      return moduleName === currentModule.name;
    });

    if (!currentNode) {
      return null;
    }

    switch (variableName) {
      case 'vpc_id':
        // Find the VPC this resource belongs to
        const vpcNode = this.findVpcForNode(currentNode, nodes);
        if (vpcNode) {
          const vpcModuleName = this.generateModuleName(vpcNode);
          return `module.${vpcModuleName}.vpc_id`;
        }
        break;

      case 'internet_gateway_id':
        // For public subnets, find the VPC's internet gateway
        if (currentNode.resourceType === 'aws-public-subnet') {
          const vpcNode = this.findVpcForNode(currentNode, nodes);
          if (vpcNode) {
            const vpcModuleName = this.generateModuleName(vpcNode);
            return `module.${vpcModuleName}.internet_gateway_id`;
          }
        }
        break;

      case 'subnet_id':
        // For EC2 instances, find the subnet they belong to
        if (currentNode.resourceType === 'aws-ec2') {
          const subnetId = currentNode.configuration?.subnetId || currentNode.parentId;
          if (subnetId) {
            const subnetNode = nodes.find(n => n.id === subnetId);
            if (subnetNode) {
              const subnetModuleName = this.generateModuleName(subnetNode);
              return `module.${subnetModuleName}.subnet_id`;
            }
          }
        }
        break;

      case 'nat_gateway_id':
        // For private subnets, this would need NAT gateway logic
        // For now, return null since we don't have NAT gateway implementation
        return null;

      default:
        return null;
    }

    return null;
  }

  /**
   * Find the VPC node that contains this node
   */
  private static findVpcForNode(node: any, nodes: any[]): any | null {
    // Direct reference
    const vpcId = node.configuration?.awsVpcId || node.configuration?.vpc_id;
    if (vpcId) {
      const vpcNode = nodes.find(n => n.id === vpcId);
      if (vpcNode?.resourceType === 'aws-vpc') {
        return vpcNode;
      }
    }

    // Look up the parent hierarchy
    let current = node;
    while (current && current.parentId) {
      const parent = nodes.find(n => n.id === current.parentId);
      if (parent?.resourceType === 'aws-vpc') {
        return parent;
      }
      current = parent;
    }
    
    return null;
  }

  /**
   * Generate module name from node (should match ModuleMapperService.generateModuleInstanceName logic)
   */
  private static generateModuleName(node: any): string {
    // Use node name if available, otherwise use sanitized node ID
    const baseName = node.name || node.id;
    const sanitized = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');

    // Add a short hash to ensure uniqueness
    const hash = node.id.slice(-6);

    return `${sanitized}_${hash}`;
  }

  /**
   * Generate variables.tf
   */
  private static generateVariablesTf(
    modules: GeneratedModule[],
    metadata: ArchitectureMetadata
  ): string {
    let content = this.generateFileHeader('Input variables for the Terraform configuration');

    // Common variables
    content += `
variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "${metadata.region}"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "${metadata.environment}"

  validation {
    condition = contains(["dev", "development", "staging", "prod", "production"], var.environment)
    error_message = "Environment must be one of: dev, development, staging, prod, production."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "${metadata.project}"
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Environment = "${metadata.environment}"
    Project     = "${metadata.project}"
    ManagedBy   = "Terraform"
    CreatedBy   = "Darch"
  }
}
`;

    // Extract unique variables from modules
    const uniqueVars = this.extractUniqueVariables(modules);
    for (const variable of uniqueVars) {
      content += variable + '\n';
    }

    return content;
  }

  /**
   * Generate outputs.tf
   */
  private static generateOutputsTf(modules: GeneratedModule[]): string {
    let content = this.generateFileHeader('Output values from the Terraform configuration');

    for (const module of modules) {
      if (module.outputs) {
        content += `\n# Outputs from ${module.name} module\n`;

        for (const [outputName, outputValue] of Object.entries(module.outputs)) {
          const sanitizedName = `${module.name}_${outputName}`;
          content += `
output "${sanitizedName}" {
  description = "Output ${outputName} from ${module.name} module"
  value       = ${outputValue}
}
`;
        }
      }
    }

    return content;
  }

  /**
   * Generate terraform.tfvars
   */
  private static generateTerraformTfvars(
    modules: GeneratedModule[],
    metadata: ArchitectureMetadata
  ): string {
    let content = this.generateFileHeader('Variable values for the Terraform configuration', '#');

    content += `
# Project Configuration
aws_region   = "${metadata.region}"
environment  = "${metadata.environment}"
project_name = "${metadata.project}"

# Common Tags
common_tags = {
  Environment = "${metadata.environment}"
  Project     = "${metadata.project}"
  ManagedBy   = "Terraform"
  CreatedBy   = "Darch"
  Version     = "${metadata.version}"
}
`;

    return content;
  }

  /**
   * Generate providers.tf
   */
  private static generateProvidersVersionsTf(metadata: ArchitectureMetadata): string {
    let content = this.generateFileHeader('Provider and version constraints');

    content += `
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment and configure for remote state
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "${metadata.project}/${metadata.environment}/terraform.tfstate"
  #   region = "${metadata.region}"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.common_tags
  }
}
`;

    return content;
  }

  /**
   * Extract unique variables from all modules
   */
  private static extractUniqueVariables(modules: GeneratedModule[]): string[] {
    const uniqueVars = new Set<string>();
    const variableBlocks: string[] = [];

    for (const module of modules) {
      for (const [varName, value] of Object.entries(module.variables)) {
        if (!uniqueVars.has(varName) && !this.isCommonVariable(varName)) {
          uniqueVars.add(varName);
          variableBlocks.push(this.generateVariableBlock(varName, value));
        }
      }
    }

    return variableBlocks;
  }

  /**
   * Check if variable is already defined as common variable
   */
  private static isCommonVariable(varName: string): boolean {
    const commonVars = ['aws_region', 'environment', 'project_name', 'common_tags'];
    return commonVars.includes(varName);
  }

  /**
   * Generate variable block
   */
  private static generateVariableBlock(varName: string, value: any): string {
    const type = this.inferVariableType(value);
    const description = this.generateVariableDescription(varName);

    return `
variable "${varName}" {
  description = "${description}"
  type        = ${type}
  default     = ${this.formatTerraformValue(value)}
}
`;
  }

  /**
   * Infer Terraform variable type
   */
  private static inferVariableType(value: any): string {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'bool';
    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'string') {
        return 'list(string)';
      }
      return 'list(any)';
    }
    if (typeof value === 'object' && value !== null) {
      return 'map(any)';
    }
    return 'any';
  }

  /**
   * Generate variable description
   */
  private static generateVariableDescription(varName: string): string {
    const descriptions: Record<string, string> = {
      'instance_type': 'EC2 instance type',
      'ami_id': 'AMI ID for EC2 instances',
      'cidr_block': 'CIDR block for network resources',
      'availability_zone': 'Availability zone for resources',
      'subnet_type': 'Type of subnet (public, private, database)',
      'bucket_name': 'Name of the S3 bucket',
      'security_group_ids': 'List of security group IDs',
      'key_name': 'EC2 key pair name',
      'tags': 'Tags to apply to resources'
    };

    return descriptions[varName] || `Configuration for ${varName}`;
  }

  /**
   * Format value for Terraform syntax
   */
  private static formatTerraformValue(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }

    if (typeof value === 'string') {
      // Check if it's a Terraform reference (starts with var., module., etc.)
      if (value.match(/^(var\.|module\.|data\.|local\.)/)) {
        return value;
      }
      return `"${value}"`;
    }

    if (typeof value === 'boolean') {
      return value.toString();
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (Array.isArray(value)) {
      const items = value.map(item => this.formatTerraformValue(item)).join(', ');
      return `[${items}]`;
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value)
        .map(([k, v]) => `    ${k} = ${this.formatTerraformValue(v)}`)
        .join('\n');
      return `{\n${entries}\n  }`;
    }

    return `"${value}"`;
  }

  /**
   * Generate file header comment
   */
  private static generateFileHeader(description: string, commentChar: string = '#'): string {
    const border = commentChar.repeat(80);
    return `${border}
${commentChar} ${description}
${commentChar} Generated by Darch - Diagram to Infrastructure Tool
${commentChar}
${commentChar} This file was automatically generated from architecture diagrams.
${commentChar} Manual modifications may be overwritten during regeneration.
${commentChar}
${commentChar} Generation time: ${new Date().toISOString()}
${border}

`;
  }

  /**
   * Validate generated Terraform syntax
   */
  static validateTerraformSyntax(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic syntax validation
    if (!this.validateBraces(content)) {
      errors.push('Mismatched braces in Terraform configuration');
    }

    if (!this.validateQuotes(content)) {
      errors.push('Mismatched quotes in Terraform configuration');
    }

    // Check for required blocks
    if (!content.includes('terraform {')) {
      errors.push('Missing terraform configuration block');
    }

    if (!content.includes('provider ')) {
      errors.push('Missing provider configuration');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate brace matching
   */
  private static validateBraces(content: string): boolean {
    let count = 0;
    for (const char of content) {
      if (char === '{') count++;
      if (char === '}') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  /**
   * Validate quote matching
   */
  private static validateQuotes(content: string): boolean {
    let inQuotes = false;
    let escaped = false;

    for (const char of content) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
      }
    }

    return !inQuotes;
  }
}
