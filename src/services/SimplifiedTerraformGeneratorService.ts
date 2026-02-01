/**
 * SimplifiedTerraformGeneratorService
 *
 * A streamlined Terraform code generator that works with NormalizedArchitecture.
 * This replaces the more complex ModularTerraformGeneratorService by:
 * - Using pre-computed module references (no placeholder resolution)
 * - Simpler module block generation
 * - Direct configuration to HCL conversion
 */

import {
	NormalizedArchitecture,
	NormalizedResource,
	NormalizedMetadata,
} from "./ArchitectureNormalizerService.js";
import { GeneratedModule } from "../models/TerraformModule.js";
import { ModuleRegistryService } from "./ModuleRegistryService.js";
import { logger, LogLevel } from "../utils/Logger.js";

// ============================================================================
// INTERFACES
// ============================================================================

export interface TerraformGenerationResult {
	mainTf: string;
	variablesTf: string;
	outputsTf: string;
	terraformTfvars: string;
	providersVersionsTf: string;
	files: GeneratedTerraformFile[];
}

export interface GeneratedTerraformFile {
	filename: string;
	content: string;
	description: string;
}

export interface ModuleDependency {
	moduleId: string;
	dependsOn: string[];
	level: number;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class SimplifiedTerraformGeneratorService {

	/**
	 * Generate complete Terraform configuration from normalized architecture
	 */
	static async generateTerraformConfiguration(
		architecture: NormalizedArchitecture,
		projectName: string = "infrastructure"
	): Promise<TerraformGenerationResult> {
		const startTime = Date.now();

		logger.terraform(LogLevel.INFO, "Generating Terraform configuration", {
			projectName,
			resourceCount: architecture.resources.length,
			provider: architecture.metadata.provider,
		});

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

		const files: GeneratedTerraformFile[] = [
			{ filename: "main.tf", content: mainTf, description: "Main Terraform configuration with module definitions" },
			{ filename: "variables.tf", content: variablesTf, description: "Input variables for the Terraform configuration" },
			{ filename: "outputs.tf", content: outputsTf, description: "Output values from the Terraform configuration" },
			{ filename: "terraform.tfvars", content: terraformTfvars, description: "Variable values for the Terraform configuration" },
			{ filename: "providers.tf", content: providersVersionsTf, description: "Provider and version constraints" },
		];

		const duration = Date.now() - startTime;

		logger.terraform(LogLevel.INFO, "Terraform configuration generated", {
			projectName,
			filesGenerated: files.length,
			totalLines: files.reduce((sum, f) => sum + f.content.split("\n").length, 0),
			duration,
		});

		return {
			mainTf,
			variablesTf,
			outputsTf,
			terraformTfvars,
			providersVersionsTf,
			files,
		};
	}

	// ============================================================================
	// MODULE GENERATION
	// ============================================================================

	/**
	 * Generate module definitions from normalized resources
	 */
	private static async generateModules(architecture: NormalizedArchitecture): Promise<GeneratedModule[]> {
		const modules: GeneratedModule[] = [];

		// Process resources in dependency order
		for (const resourceId of architecture.dependencyOrder) {
			const resource = architecture.resources.find(r => r.id === resourceId);
			if (!resource) continue;

			try {
				const module = await this.resourceToModule(resource, architecture);
				if (module) {
					modules.push(module);
				}
			} catch (error) {
				logger.warn(`Failed to generate module for ${resourceId}: ${error instanceof Error ? error.message : "Unknown error"}`, {});
			}
		}

		return modules;
	}

	/**
	 * Convert a normalized resource to a GeneratedModule
	 */
	private static async resourceToModule(
		resource: NormalizedResource,
		architecture: NormalizedArchitecture
	): Promise<GeneratedModule | null> {
		const [category, moduleName] = resource.terraformModule.split("/");

		// Get module definition from registry
		const moduleDefinition = await ModuleRegistryService.getModule(category, moduleName);
		if (!moduleDefinition) {
			logger.warn(`Module ${resource.terraformModule} not found in registry`, {});
			return null;
		}

		// Map configuration to module variables
		const variables = this.mapConfigurationToVariables(
			resource,
			moduleDefinition,
			architecture
		);

		// Generate outputs mapping
		const outputs = this.generateOutputsMapping(moduleDefinition, resource.moduleName);

		return {
			name: resource.moduleName,
			source: `../../../../data/terraform-modules/${category}/${moduleName}`,
			variables,
			outputs,
		};
	}

	/**
	 * Map resource configuration to module variables
	 */
	private static mapConfigurationToVariables(
		resource: NormalizedResource,
		moduleDefinition: any,
		architecture: NormalizedArchitecture
	): Record<string, any> {
		const variables: Record<string, any> = {};
		const config = resource.configuration;

		// Map each module variable
		for (const moduleVar of moduleDefinition.variables || []) {
			const varName = moduleVar.name;
			let value = config[varName];

			// Handle special variable mappings
			switch (varName) {
				case "name":
					value = value ?? resource.name;
					break;
				case "region":
					value = value ?? architecture.metadata.region;
					break;
				case "availability_zone":
					value = value ?? `${architecture.metadata.region}a`;
					break;
				case "cidr_block":
					value = value ?? this.getDefaultCidr(resource.terraformModule);
					break;
				case "instance_type":
					value = value ?? "t3.micro";
					break;
				case "ami_id":
					// Handle AMI - null means use data source
					if (!value || value === "" || value === "latest") {
						value = null;
					}
					break;
				case "bucket_name":
					value = value ?? this.generateBucketName(resource.name);
					break;
				case "subnet_type":
					value = value ?? this.inferSubnetType(resource);
					break;
				case "map_public_ip_on_launch":
					value = value ?? (this.inferSubnetType(resource) === "public");
					break;
				case "connectivity_type":
					value = value ?? "public";
					break;
				case "create_eip":
					if (config.connectivity_type === "public" && !config.allocation_id) {
						value = value ?? true;
					}
					break;
				case "routes":
				case "associations":
					// Ensure these are maps, not arrays
					if (Array.isArray(value)) {
						value = {};
					}
					value = value ?? {};
					break;
				default:
					// Use default from module definition if not in config
					if (value === undefined) {
						value = moduleVar.default;
					}
			}

			// Only set if we have a value
			if (value !== undefined) {
				variables[varName] = value;
			}
		}

		// Add tags
		variables.tags = {
			...architecture.metadata.tags,
			Name: resource.name,
			ResourceType: resource.resourceType,
			NodeId: resource.id,
			...config.tags,
		};

		return variables;
	}

	/**
	 * Generate outputs mapping for a module
	 */
	private static generateOutputsMapping(
		moduleDefinition: any,
		moduleName: string
	): Record<string, string> {
		const outputs: Record<string, string> = {};

		for (const output of moduleDefinition.outputs || []) {
			outputs[output.name] = `module.${moduleName}.${output.name}`;
		}

		return outputs;
	}

	// ============================================================================
	// DEPENDENCY BUILDING
	// ============================================================================

	/**
	 * Build module dependencies from normalized architecture
	 */
	private static buildDependencies(architecture: NormalizedArchitecture): ModuleDependency[] {
		const dependencies: ModuleDependency[] = [];

		for (const resource of architecture.resources) {
			const dependsOn = resource.dependencies
				.map(depId => {
					const depResource = architecture.resources.find(r => r.id === depId);
					return depResource?.moduleName;
				})
				.filter((name): name is string => !!name);

			dependencies.push({
				moduleId: resource.moduleName,
				dependsOn,
				level: this.calculateDependencyLevel(resource, architecture.resources),
			});
		}

		return dependencies;
	}

	/**
	 * Calculate dependency level for ordering
	 */
	private static calculateDependencyLevel(
		resource: NormalizedResource,
		allResources: NormalizedResource[]
	): number {
		const resourceMap = new Map(allResources.map(r => [r.id, r]));
		const visited = new Set<string>();

		const calculateLevel = (resourceId: string): number => {
			if (visited.has(resourceId)) return 0;
			visited.add(resourceId);

			const res = resourceMap.get(resourceId);
			if (!res || res.dependencies.length === 0) return 0;

			return 1 + Math.max(...res.dependencies.map(depId => calculateLevel(depId)));
		};

		return calculateLevel(resource.id);
	}

	// ============================================================================
	// TERRAFORM FILE GENERATION
	// ============================================================================

	/**
	 * Generate main.tf content
	 */
	private static generateMainTf(
		modules: GeneratedModule[],
		dependencies: ModuleDependency[],
		metadata: NormalizedMetadata
	): string {
		const dependencyMap = new Map(dependencies.map(d => [d.moduleId, d]));

		// Sort modules by dependency level
		const sortedModules = [...modules].sort((a, b) => {
			const aLevel = dependencyMap.get(a.name)?.level || 0;
			const bLevel = dependencyMap.get(b.name)?.level || 0;
			return aLevel - bLevel;
		});

		let content = this.generateFileHeader("Main Terraform configuration");
		content += this.generateLocalsBlock(metadata);
		content += "\n";

		for (const module of sortedModules) {
			content += this.generateModuleBlock(module, dependencyMap);
			content += "\n";
		}

		return content;
	}

	/**
	 * Generate locals block
	 */
	private static generateLocalsBlock(_metadata: NormalizedMetadata): string {
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
	 * Generate a module block with production-grade formatting
	 */
	private static generateModuleBlock(
		module: GeneratedModule,
		dependencyMap: Map<string, ModuleDependency>
	): string {
		const lines: string[] = [];
		lines.push(`module "${module.name}" {`);
		lines.push(`  source = "${module.source}"`);
		lines.push("");

		// Categorize variables for better organization
		const tags: [string, any][] = [];
		const references: [string, any][] = [];  // module references
		const required: [string, any][] = [];
		const optional: [string, any][] = [];

		const requiredFields = new Set(["name", "cidr_block", "instance_type", "vpc_id", "subnet_id", "availability_zone"]);

		for (const [key, value] of Object.entries(module.variables)) {
			if (value === null || value === undefined) continue;

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

		// Sort each category alphabetically
		const sortFn = ([a]: [string, any], [b]: [string, any]) => a.localeCompare(b);
		required.sort(sortFn);
		references.sort(sortFn);
		optional.sort(sortFn);

		// Determine max key length for alignment (exclude tags)
		const allNonTags = [...required, ...references, ...optional];
		const maxKeyLen = Math.max(...allNonTags.map(([k]) => k.length), 10);

		// Add required variables first
		for (const [key, value] of required) {
			const formattedValue = this.formatTerraformValue(value);
			lines.push(`  ${key.padEnd(maxKeyLen)} = ${formattedValue}`);
		}

		// Add module references
		if (references.length > 0 && required.length > 0) {
			lines.push("");  // Separator
		}
		for (const [key, value] of references) {
			const formattedValue = this.formatTerraformValue(value);
			lines.push(`  ${key.padEnd(maxKeyLen)} = ${formattedValue}`);
		}

		// Add optional variables
		if (optional.length > 0 && (required.length > 0 || references.length > 0)) {
			lines.push("");  // Separator
		}
		for (const [key, value] of optional) {
			const formattedValue = this.formatTerraformValue(value);
			lines.push(`  ${key.padEnd(maxKeyLen)} = ${formattedValue}`);
		}

		// Add tags last (usually the largest block)
		if (tags.length > 0) {
			lines.push("");
			for (const [key, value] of tags) {
				const formattedValue = this.formatTerraformValue(value);
				lines.push(`  ${key.padEnd(maxKeyLen)} = ${formattedValue}`);
			}
		}

		// Add depends_on if there are dependencies
		const dependency = dependencyMap.get(module.name);
		if (dependency && dependency.dependsOn.length > 0) {
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

	/**
	 * Generate variables.tf content
	 */
	private static generateVariablesTf(metadata: NormalizedMetadata): string {
		let content = this.generateFileHeader("Input variables for the Terraform configuration");

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

		return content;
	}

	/**
	 * Generate outputs.tf content with categorized outputs
	 */
	private static generateOutputsTf(modules: GeneratedModule[]): string {
		let content = this.generateFileHeader("Output values from the Terraform configuration");

		// Categorize outputs by type for better organization
		const categories: Record<string, Array<{ module: string; name: string; value: string }>> = {
			networking: [],
			compute: [],
			security: [],
			storage: [],
			database: [],
			other: [],
		};

		for (const module of modules) {
			if (!module.outputs || Object.keys(module.outputs).length === 0) continue;

			// Determine category based on module source
			let category = "other";
			if (module.source.includes("networking")) category = "networking";
			else if (module.source.includes("compute")) category = "compute";
			else if (module.source.includes("security")) category = "security";
			else if (module.source.includes("storage")) category = "storage";
			else if (module.source.includes("database")) category = "database";

			for (const [outputName, outputValue] of Object.entries(module.outputs)) {
				categories[category].push({
					module: module.name,
					name: outputName,
					value: outputValue,
				});
			}
		}

		// Generate outputs by category
		for (const [category, outputs] of Object.entries(categories)) {
			if (outputs.length === 0) continue;

			content += `\n# ============================================================================\n`;
			content += `# ${category.toUpperCase()} OUTPUTS\n`;
			content += `# ============================================================================\n`;

			for (const { module: moduleName, name, value } of outputs) {
				const sanitizedName = `${moduleName}_${name}`;
				content += `
output "${sanitizedName}" {
  description = "${name.replace(/_/g, " ")} from ${moduleName} module"
  value       = ${value}
}
`;
			}
		}

		return content;
	}

	/**
	 * Generate terraform.tfvars content
	 */
	private static generateTerraformTfvars(metadata: NormalizedMetadata): string {
		let content = this.generateFileHeader("Variable values for the Terraform configuration", "#");

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
	 * Generate providers.tf content
	 */
	private static generateProvidersVersionsTf(metadata: NormalizedMetadata): string {
		let content = this.generateFileHeader("Provider and version constraints");

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

	// ============================================================================
	// UTILITY METHODS
	// ============================================================================

	/**
	 * Format a value for Terraform HCL syntax
	 * Produces production-grade, properly formatted output
	 */
	private static formatTerraformValue(value: any, indent: number = 2): string {
		const indentStr = " ".repeat(indent);
		const innerIndent = " ".repeat(indent + 2);

		if (value === null || value === undefined) {
			return "null";
		}

		if (typeof value === "string") {
			// Check if it's a Terraform reference (var., module., data., local., etc.)
			if (value.match(/^(var\.|module\.|data\.|local\.|aws_)/)) {
				return value;
			}
			// Escape special characters for HCL strings
			const escaped = value
				.replace(/\\/g, "\\\\")
				.replace(/"/g, '\\"')
				.replace(/\n/g, "\\n")
				.replace(/\r/g, "\\r")
				.replace(/\t/g, "\\t");
			return `"${escaped}"`;
		}

		if (typeof value === "boolean") {
			return value.toString();
		}

		if (typeof value === "number") {
			return value.toString();
		}

		if (Array.isArray(value)) {
			// Empty arrays
			if (value.length === 0) {
				return "[]";
			}

			// Simple arrays (primitives) - inline format
			if (value.every(item => typeof item !== "object" || item === null)) {
				const items = value.map(item => this.formatTerraformValue(item, indent)).join(", ");
				return `[${items}]`;
			}

			// Complex arrays (objects) - multiline format
			const items = value.map(item => {
				const formatted = this.formatTerraformValue(item, indent + 2);
				return `${innerIndent}${formatted}`;
			}).join(",\n");
			return `[\n${items}\n${indentStr}]`;
		}

		if (typeof value === "object") {
			const entries = Object.entries(value);

			// Empty objects
			if (entries.length === 0) {
				return "{}";
			}

			// Sort keys for consistent output
			entries.sort(([a], [b]) => a.localeCompare(b));

			const formatted = entries
				.map(([k, v]) => {
					// Sanitize key - remove invalid characters, handle reserved words
					const safeKey = k.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/) ? k : `"${k}"`;
					return `${innerIndent}${safeKey} = ${this.formatTerraformValue(v, indent + 2)}`;
				})
				.join("\n");

			return `{\n${formatted}\n${indentStr}}`;
		}

		return `"${String(value)}"`;
	}

	/**
	 * Generate file header comment
	 */
	private static generateFileHeader(description: string, commentChar: string = "#"): string {
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
	 * Get default CIDR for a module type
	 */
	private static getDefaultCidr(terraformModule: string): string {
		const defaults: Record<string, string> = {
			"networking/vpc": "10.0.0.0/16",
			"networking/subnet": "10.0.1.0/24",
		};
		return defaults[terraformModule] || "10.0.0.0/24";
	}

	/**
	 * Generate unique bucket name
	 */
	private static generateBucketName(baseName: string): string {
		const sanitized = baseName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
		const timestamp = Date.now().toString(36);
		return `${sanitized}-${timestamp}`;
	}

	/**
	 * Infer subnet type from resource
	 */
	private static inferSubnetType(resource: NormalizedResource): string {
		const name = resource.name.toLowerCase();
		const resourceType = resource.resourceType.toLowerCase();

		if (name.includes("public") || resourceType.includes("public")) {
			return "public";
		}
		if (name.includes("private") || resourceType.includes("private")) {
			return "private";
		}
		if (name.includes("database") || name.includes("db")) {
			return "database";
		}

		return "private";  // Default to private for security
	}

	/**
	 * Validate generated Terraform syntax
	 */
	static validateTerraformSyntax(content: string): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		// Check brace matching
		let braceCount = 0;
		for (const char of content) {
			if (char === "{") braceCount++;
			if (char === "}") braceCount--;
			if (braceCount < 0) {
				errors.push("Mismatched braces in Terraform configuration");
				break;
			}
		}
		if (braceCount !== 0 && errors.length === 0) {
			errors.push("Mismatched braces in Terraform configuration");
		}

		// Check quote matching
		let inQuotes = false;
		let escaped = false;
		for (const char of content) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (char === "\\") {
				escaped = true;
				continue;
			}
			if (char === '"') {
				inQuotes = !inQuotes;
			}
		}
		if (inQuotes) {
			errors.push("Mismatched quotes in Terraform configuration");
		}

		// Check for required blocks
		if (!content.includes("terraform {")) {
			errors.push("Missing terraform configuration block");
		}
		if (!content.includes("provider ")) {
			errors.push("Missing provider configuration");
		}

		return { valid: errors.length === 0, errors };
	}
}
