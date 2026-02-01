/**
 * ArchitectureNormalizerService - Unified architecture normalization
 *
 * This service replaces the previous multi-step flow:
 * - FrontendArchitectureTransformerService
 * - ArchitectureParserService
 * - ModuleMapperService (partially)
 *
 * It provides a single-pass normalization that:
 * - Auto-detects input format (frontend/backend)
 * - Normalizes resources directly to Terraform module format
 * - Builds dependency graph once
 * - Pre-computes module references (no placeholders)
 * - Validates architecture
 */

import {
	ArchitectureData,
	FrontendArchitectureData,
	FrontendResource,
} from "../models/Architecture.js";
import { logger, LogCategory, LogLevel } from "../utils/Logger.js";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * A normalized resource ready for Terraform generation
 */
export interface NormalizedResource {
	id: string;
	name: string;
	resourceType: string;
	terraformModule: string;
	configuration: Record<string, any>;
	dependencies: string[];
	parentId?: string;
	children: string[];
	moduleName: string;           // Pre-computed: "my_vpc_abc123"
}

/**
 * Module reference information for cross-resource linking
 */
export interface ModuleReference {
	moduleName: string;
	outputs: Record<string, string>;  // output_name -> "module.name.output_name"
}

/**
 * Validation error structure
 */
export interface ValidationError {
	type: "missing_required" | "invalid_type" | "invalid_dependency" | "duplicate_resource" | "configuration_error";
	nodeId?: string;
	field?: string;
	message: string;
}

/**
 * Validation warning structure
 */
export interface ValidationWarning {
	type: "best_practice" | "security" | "performance" | "cost";
	nodeId?: string;
	message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationWarning[];
}

/**
 * Parsed metadata with defaults applied
 */
export interface NormalizedMetadata {
	provider: string;
	region: string;
	environment: string;
	project: string;
	version: string;
	tags: Record<string, string>;
}

/**
 * Connection between resources
 */
export interface NormalizedConnection {
	id: string;
	sourceId: string;
	targetId: string;
	connectionType: string;
}

/**
 * Complete normalized architecture ready for Terraform generation
 */
export interface NormalizedArchitecture {
	metadata: NormalizedMetadata;
	resources: NormalizedResource[];
	connections: NormalizedConnection[];
	moduleReferenceMap: Map<string, ModuleReference>;
	dependencyOrder: string[];      // Topologically sorted resource IDs
	validation: ValidationResult;
}

/**
 * Result of normalization process
 */
export interface NormalizationResult {
	architecture: NormalizedArchitecture;
	warnings: string[];
	errors: string[];
}

// ============================================================================
// UNIFIED RESOURCE TYPE TO MODULE MAPPING
// ============================================================================

/**
 * Canonical resource type to Terraform module mapping
 * All resource types should be normalized to canonical form first
 */
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

/**
 * Normalize resource type to canonical form
 * Handles: aws-vpc, vpc, AWS-VPC, public-subnet, aws-public-subnet, etc.
 */
function normalizeResourceType(resourceType: string): string {
	let normalized = resourceType.toLowerCase().trim();

	// Remove aws- prefix
	normalized = normalized.replace(/^aws-/, "");

	// Handle subnet variants - normalize to just "subnet"
	if (normalized.includes("subnet")) {
		return "subnet";
	}

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

/**
 * Get Terraform module for a resource type
 */
function getModuleForResourceType(resourceType: string): string | null {
	const canonical = normalizeResourceType(resourceType);
	return CANONICAL_MODULE_MAP[canonical] || null;
}

/**
 * Module output names for cross-resource references
 */
const MODULE_OUTPUTS: Record<string, string[]> = {
	"networking/vpc": ["vpc_id", "vpc_arn", "cidr_block"],
	"networking/subnet": ["subnet_id", "subnet_arn", "availability_zone"],
	"networking/internet-gateway": ["internet_gateway_id", "internet_gateway_arn"],
	"networking/nat-gateway": ["nat_gateway_id", "nat_gateway_public_ip", "allocation_id"],
	"networking/route-table": ["route_table_id", "route_table_arn"],
	"compute/ec2": ["instance_id", "public_ip", "private_ip", "instance_arn"],
	"security/security-group": ["security_group_id", "security_group_arn"],
	"storage/s3": ["bucket_id", "bucket_arn", "bucket_domain_name"],
	"database/rds": ["db_instance_id", "db_instance_arn", "endpoint", "address"],
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ArchitectureNormalizerService {

	/**
	 * Main entry point: Normalize architecture data from any format
	 */
	static async normalizeArchitecture(
		inputData: ArchitectureData | FrontendArchitectureData,
		projectName: string = "infrastructure"
	): Promise<NormalizationResult> {
		const startTime = Date.now();
		const warnings: string[] = [];
		const errors: string[] = [];

		logger.architecture(LogLevel.INFO, "Starting architecture normalization", {
			resourceCount: (inputData as any).resources?.length || 0,
			connectionCount: (inputData as any).connections?.length || 0,
		});

		try {
			// Step 1: Detect format and extract raw data
			const isFrontend = this.isFrontendFormat(inputData);

			logger.architecture(LogLevel.DEBUG, `Detected format: ${isFrontend ? "frontend" : "backend"}`, {});

			// Step 2: Normalize metadata
			const metadata = this.normalizeMetadata(inputData.metadata, projectName);

			// Step 3: Normalize resources (single pass)
			const { resources, resourceWarnings } = await this.normalizeResources(
				inputData,
				isFrontend,
				metadata
			);
			warnings.push(...resourceWarnings);

			// Step 4: Normalize connections
			const { connections, connectionWarnings } = this.normalizeConnections(
				inputData.connections || [],
				resources
			);
			warnings.push(...connectionWarnings);

			// Step 5: Build dependency graph (once)
			this.buildDependencyGraph(resources, connections);

			// Step 6: Topological sort for dependency order
			const dependencyOrder = this.topologicalSort(resources);

			// Step 7: Build module reference map (pre-computed references)
			const moduleReferenceMap = this.buildModuleReferenceMap(resources);

			// Step 8: Resolve cross-resource references
			this.resolveCrossReferences(resources, moduleReferenceMap);

			// Step 9: Validate architecture
			const validation = this.validateArchitecture(resources, connections, metadata);

			const duration = Date.now() - startTime;

			logger.architecture(LogLevel.INFO, "Architecture normalization completed", {
				resources: resources.length,
				connections: connections.length,
				valid: validation.valid,
				warnings: warnings.length,
				errors: errors.length,
				duration,
			});

			return {
				architecture: {
					metadata,
					resources,
					connections,
					moduleReferenceMap,
					dependencyOrder,
					validation,
				},
				warnings,
				errors,
			};

		} catch (error) {
			const errorMessage = `Normalization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
			errors.push(errorMessage);

			logger.error("Architecture normalization failed", {
				error: errorMessage,
				category: LogCategory.ARCHITECTURE,
			});

			// Return empty but valid structure on error
			return {
				architecture: {
					metadata: this.normalizeMetadata({}, projectName),
					resources: [],
					connections: [],
					moduleReferenceMap: new Map(),
					dependencyOrder: [],
					validation: { valid: false, errors: [{ type: "configuration_error", message: errorMessage }], warnings: [] },
				},
				warnings,
				errors,
			};
		}
	}

	// ============================================================================
	// FORMAT DETECTION
	// ============================================================================

	/**
	 * Detect if input is frontend format (has node_type field on resources)
	 */
	private static isFrontendFormat(data: any): boolean {
		return !!(
			data.metadata &&
			data.resources &&
			Array.isArray(data.resources) &&
			data.resources.length > 0 &&
			data.resources.some(
				(resource: any) =>
					resource.node_type &&
					(resource.node_type === "aws_service" || resource.node_type === "aws_container")
			)
		);
	}

	// ============================================================================
	// METADATA NORMALIZATION
	// ============================================================================

	/**
	 * Normalize metadata with defaults
	 */
	private static normalizeMetadata(metadata: any, projectName: string): NormalizedMetadata {
		return {
			provider: metadata?.provider || "aws",
			region: metadata?.region || "us-east-1",
			environment: metadata?.environment || "development",
			project: metadata?.project || projectName,
			version: metadata?.version || "1.0.0",
			tags: {
				Environment: metadata?.environment || "development",
				Project: metadata?.project || projectName,
				ManagedBy: "Terraform",
				CreatedBy: "Darch",
				...metadata?.tags,
			},
		};
	}

	// ============================================================================
	// RESOURCE NORMALIZATION
	// ============================================================================

	/**
	 * Normalize resources in a single pass
	 */
	private static async normalizeResources(
		inputData: any,
		isFrontend: boolean,
		metadata: NormalizedMetadata
	): Promise<{ resources: NormalizedResource[]; resourceWarnings: string[] }> {
		const resources: NormalizedResource[] = [];
		const resourceWarnings: string[] = [];
		const inputResources = inputData.resources || [];

		// Filter resources to process
		const resourcesToProcess = isFrontend
			? this.filterFrontendResources(inputResources)
			: inputResources;

		// Build parent mapping for hierarchy resolution
		const parentMap = new Map<string, any>(
			inputResources.map((r: any) => [r.id, r])
		);

		for (const inputResource of resourcesToProcess) {
			try {
				const normalized = await this.normalizeResource(
					inputResource,
					isFrontend,
					metadata,
					parentMap,
					inputResources
				);

				if (normalized) {
					resources.push(normalized);
				}
			} catch (error) {
				const warningMsg = `Failed to normalize resource ${inputResource.id}: ${error instanceof Error ? error.message : "Unknown error"}`;
				resourceWarnings.push(warningMsg);
				logger.warn(warningMsg, { category: LogCategory.ARCHITECTURE });
			}
		}

		// Set children relationships
		for (const resource of resources) {
			resource.children = resources
				.filter(r => r.parentId === resource.id)
				.map(r => r.id);
		}

		return { resources, resourceWarnings };
	}

	/**
	 * Filter frontend resources to only include processable ones
	 */
	private static filterFrontendResources(resources: FrontendResource[]): FrontendResource[] {
		const serviceResources = resources.filter(r => r.node_type === "aws_service");

		// Container types that should be converted to Terraform resources
		const convertibleTypes = [
			"aws-vpc",
			"aws-subnet",
			"aws-public-subnet",
			"aws-private-subnet",
			"aws-security-group",
		];

		const convertibleContainers = resources.filter(
			r => r.node_type === "aws_container" && convertibleTypes.includes(r.resource_type)
		);

		return [...serviceResources, ...convertibleContainers];
	}

	/**
	 * Normalize a single resource
	 */
	private static async normalizeResource(
		inputResource: any,
		_isFrontend: boolean,
		metadata: NormalizedMetadata,
		parentMap: Map<string, any>,
		allResources: any[]
	): Promise<NormalizedResource | null> {
		const resourceType = inputResource.resource_type || inputResource.resourceType;

		// Get Terraform module mapping
		const terraformModule = this.getModuleForResourceType(resourceType);
		if (!terraformModule) {
			logger.warn(`No module mapping for resource type: ${resourceType}`, {
				category: LogCategory.MODULE,
			});
			return null;
		}

		// Generate module name
		const moduleName = this.generateModuleName(inputResource);

		// Normalize configuration
		const configuration = this.normalizeConfiguration(
			inputResource,
			resourceType,
			metadata,
			parentMap,
			allResources
		);

		return {
			id: inputResource.id,
			name: inputResource.name || inputResource.id,
			resourceType,
			terraformModule,
			configuration,
			dependencies: [],  // Will be populated by buildDependencyGraph
			parentId: inputResource.parent_id || inputResource.parentId,
			children: [],      // Will be populated after all resources are processed
			moduleName,
		};
	}

	/**
	 * Get Terraform module path for a resource type
	 * Uses the module-level getModuleForResourceType function
	 */
	private static getModuleForResourceType(resourceType: string): string | null {
		return getModuleForResourceType(resourceType);
	}

	/**
	 * Generate unique module instance name
	 * Module names must be valid Terraform identifiers: [a-z0-9_]+
	 */
	private static generateModuleName(resource: any): string {
		const baseName = resource.name || resource.id;
		const sanitized = baseName
			.toLowerCase()
			.replace(/[^a-z0-9]/g, "_")
			.replace(/_{2,}/g, "_")
			.replace(/^_+|_+$/g, "");

		// Sanitize the hash too (IDs can contain hyphens)
		const hash = resource.id.slice(-6).replace(/[^a-z0-9]/gi, "");
		return `${sanitized}_${hash}`;
	}

	/**
	 * Normalize resource configuration with defaults and references
	 */
	private static normalizeConfiguration(
		resource: any,
		resourceType: string,
		metadata: NormalizedMetadata,
		parentMap: Map<string, any>,
		_allResources: any[]
	): Record<string, any> {
		const config: Record<string, any> = resource.configuration ? { ...resource.configuration } : {};

		// Apply resource-specific normalization
		switch (resourceType) {
			case "aws-vpc":
			case "vpc":
				this.normalizeVpcConfig(config);
				break;
			case "aws-subnet":
			case "aws-public-subnet":
			case "aws-private-subnet":
			case "subnet":
				this.normalizeSubnetConfig(config, resource, resourceType, metadata, parentMap);
				break;
			case "aws-ec2":
			case "ec2":
				this.normalizeEc2Config(config, resource, parentMap);
				break;
			case "aws-security-group":
			case "security-group":
				this.normalizeSecurityGroupConfig(config);
				break;
			case "aws-internet-gateway":
			case "internet-gateway":
				this.normalizeInternetGatewayConfig(config, resource, parentMap);
				break;
			case "aws-nat-gateway":
			case "nat-gateway":
				this.normalizeNatGatewayConfig(config, resource, parentMap);
				break;
			case "aws-route-table":
			case "route-table":
				this.normalizeRouteTableConfig(config, resource, parentMap);
				break;
			case "aws-s3":
			case "s3":
				this.normalizeS3Config(config, resource);
				break;
			case "aws-rds":
			case "rds":
				this.normalizeRdsConfig(config);
				break;
		}

		// Ensure tags exist
		if (!config.tags) {
			config.tags = {};
		}
		config.tags.Name = resource.name || resource.id;
		config.tags.ResourceId = resource.id;

		return config;
	}

	// ============================================================================
	// RESOURCE-SPECIFIC CONFIGURATION NORMALIZERS
	// ============================================================================

	private static normalizeVpcConfig(config: Record<string, any>): void {
		if (config.enable_dns_support === undefined) {
			config.enable_dns_support = true;
		}
		if (config.enable_dns_hostnames === undefined) {
			config.enable_dns_hostnames = false;
		}
	}

	private static normalizeSubnetConfig(
		config: Record<string, any>,
		resource: any,
		resourceType: string,
		metadata: NormalizedMetadata,
		parentMap: Map<string, any>
	): void {
		// Determine subnet type
		if (!config.subnet_type) {
			config.subnet_type = resourceType.includes("public") ? "public" : "private";
		}

		// Set map_public_ip_on_launch based on subnet type
		if (config.map_public_ip_on_launch === undefined) {
			config.map_public_ip_on_launch = config.subnet_type === "public";
		}

		// Default availability zone
		if (!config.availability_zone) {
			config.availability_zone = `${metadata.region}a`;
		}

		// Find VPC reference from parent hierarchy
		if (!config.vpc_id && resource.parent_id) {
			const vpc = this.findVpcInHierarchy(resource, parentMap);
			if (vpc) {
				config._vpc_reference = vpc.id;  // Store for later resolution
			}
		}
	}

	private static normalizeEc2Config(
		config: Record<string, any>,
		resource: any,
		parentMap: Map<string, any>
	): void {
		// Default instance type
		if (!config.instance_type) {
			config.instance_type = "t3.micro";
		}

		// Default root block device
		if (!config.root_block_device) {
			config.root_block_device = {
				volume_size: 8,
				volume_type: "gp3",
				delete_on_termination: true,
				encrypted: false,
			};
		}

		// Initialize arrays if not present
		if (!config.ebs_block_device) {
			config.ebs_block_device = [];
		}
		if (!config.security_group_ids) {
			config.security_group_ids = [];
		}

		// Find subnet reference from parent hierarchy
		if (!config.subnet_id && resource.parent_id) {
			const parent = parentMap.get(resource.parent_id);
			if (parent && parent.resource_type?.includes("subnet")) {
				config._subnet_reference = parent.id;
			}
		}
	}

	private static normalizeSecurityGroupConfig(config: Record<string, any>): void {
		if (!config.description && !config.name) {
			config.description = "Security group created by Darch";
		}
		if (!config.ingress_rules) {
			config.ingress_rules = [];
		}
		if (!config.egress_rules) {
			config.egress_rules = [];
		}
	}

	private static normalizeInternetGatewayConfig(
		config: Record<string, any>,
		resource: any,
		parentMap: Map<string, any>
	): void {
		// Find VPC reference
		if (!config.vpc_id && resource.parent_id) {
			const vpc = this.findVpcInHierarchy(resource, parentMap);
			if (vpc) {
				config._vpc_reference = vpc.id;
			}
		}
	}

	private static normalizeNatGatewayConfig(
		config: Record<string, any>,
		resource: any,
		parentMap: Map<string, any>
	): void {
		if (!config.connectivity_type) {
			config.connectivity_type = "public";
		}

		if (config.connectivity_type === "public" && !config.allocation_id && config.create_eip === undefined) {
			config.create_eip = true;
		}

		// Find subnet reference from parent
		if (!config.subnet_id && resource.parent_id) {
			const parent = parentMap.get(resource.parent_id);
			if (parent && parent.resource_type?.includes("subnet")) {
				config._subnet_reference = parent.id;
			}
		}
	}

	private static normalizeRouteTableConfig(
		config: Record<string, any>,
		resource: any,
		parentMap: Map<string, any>
	): void {
		// Ensure routes is a map
		if (!config.routes || typeof config.routes !== "object" || Array.isArray(config.routes)) {
			config.routes = {};
		}

		// Ensure associations is a map
		if (config.associations && Array.isArray(config.associations)) {
			const associationsMap: Record<string, any> = {};
			config.associations.forEach((assoc: any, index: number) => {
				const key = assoc.subnet_id ? `subnet_${assoc.subnet_id}` : `association_${index}`;
				associationsMap[key] = assoc;
			});
			config.associations = associationsMap;
		} else if (!config.associations) {
			config.associations = {};
		}

		// Find VPC reference
		if (!config.vpc_id && resource.parent_id) {
			const vpc = this.findVpcInHierarchy(resource, parentMap);
			if (vpc) {
				config._vpc_reference = vpc.id;
			}
		}
	}

	private static normalizeS3Config(config: Record<string, any>, resource: any): void {
		if (!config.bucket_name) {
			const sanitized = (resource.name || resource.id).toLowerCase().replace(/[^a-z0-9-]/g, "-");
			const timestamp = Date.now().toString(36);
			config.bucket_name = `${sanitized}-${timestamp}`;
		}
	}

	private static normalizeRdsConfig(_config: Record<string, any>): void {
		// RDS config is usually already well-formed - no normalization needed
	}

	/**
	 * Find VPC in parent hierarchy
	 */
	private static findVpcInHierarchy(resource: any, parentMap: Map<string, any>): any | null {
		let current = resource;
		while (current?.parent_id || current?.parentId) {
			const parentId = current.parent_id || current.parentId;
			const parent = parentMap.get(parentId);
			if (!parent) break;

			if (parent.resource_type?.includes("vpc")) {
				return parent;
			}
			current = parent;
		}
		return null;
	}

	// ============================================================================
	// CONNECTION NORMALIZATION
	// ============================================================================

	/**
	 * Normalize connections between resources
	 * Handles both snake_case (source_handle) and camelCase (sourceHandle) for compatibility
	 */
	private static normalizeConnections(
		connections: any[],
		resources: NormalizedResource[]
	): { connections: NormalizedConnection[]; connectionWarnings: string[] } {
		const normalized: NormalizedConnection[] = [];
		const warnings: string[] = [];
		const resourceIds = new Set(resources.map(r => r.id));

		for (const conn of connections) {
			// Handle both naming conventions for source/target
			const sourceId = conn.source_id || conn.sourceId || conn.source;
			const targetId = conn.target_id || conn.targetId || conn.target;

			// Validate source and target exist
			if (!resourceIds.has(sourceId)) {
				warnings.push(`Connection source ${sourceId} not found`);
				continue;
			}
			if (!resourceIds.has(targetId)) {
				warnings.push(`Connection target ${targetId} not found`);
				continue;
			}

			normalized.push({
				id: conn.id || `connection-${normalized.length}`,
				sourceId,
				targetId,
				connectionType: conn.connection_type || conn.connectionType || conn.type || "dependency",
			});
		}

		return { connections: normalized, connectionWarnings: warnings };
	}

	// ============================================================================
	// DEPENDENCY GRAPH
	// ============================================================================

	/**
	 * Build dependency graph from connections and parent-child relationships
	 */
	private static buildDependencyGraph(
		resources: NormalizedResource[],
		connections: NormalizedConnection[]
	): void {
		const resourceMap = new Map(resources.map(r => [r.id, r]));
		const resourceIds = new Set(resources.map(r => r.id));

		// Add parent dependencies (child depends on parent)
		for (const resource of resources) {
			if (resource.parentId && resourceIds.has(resource.parentId)) {
				if (!resource.dependencies.includes(resource.parentId)) {
					resource.dependencies.push(resource.parentId);
				}
			}
		}

		// Add connection-based dependencies with smart direction handling
		for (const connection of connections) {
			const source = resourceMap.get(connection.sourceId);
			const target = resourceMap.get(connection.targetId);
			if (!source || !target) continue;

			const direction = this.determineConnectionDependency(source, target);

			if (direction === "source-depends-on-target") {
				if (!source.dependencies.includes(target.id)) {
					source.dependencies.push(target.id);
				}
			} else {
				if (!target.dependencies.includes(source.id)) {
					target.dependencies.push(source.id);
				}
			}
		}

		// Add implicit dependencies based on AWS resource relationships
		this.addImplicitDependencies(resources);
	}

	/**
	 * Determine dependency direction based on resource types
	 */
	private static determineConnectionDependency(
		source: NormalizedResource,
		target: NormalizedResource
	): "source-depends-on-target" | "target-depends-on-source" {
		// Route tables connecting to gateways: route table depends on gateway
		if (source.terraformModule === "networking/route-table") {
			if (target.terraformModule === "networking/internet-gateway" ||
				target.terraformModule === "networking/nat-gateway" ||
				target.terraformModule === "networking/subnet") {
				return "source-depends-on-target";
			}
		}

		// EC2 connecting to security group: EC2 depends on SG
		if (source.terraformModule === "compute/ec2" &&
			target.terraformModule === "security/security-group") {
			return "source-depends-on-target";
		}

		// Default: target depends on source
		return "target-depends-on-source";
	}

	/**
	 * Add implicit dependencies based on AWS resource relationships
	 */
	private static addImplicitDependencies(resources: NormalizedResource[]): void {
		for (const resource of resources) {
			switch (resource.terraformModule) {
				case "networking/subnet":
					// Subnet needs VPC
					if (!resource.configuration.vpc_id && !resource.configuration._vpc_reference) {
						const vpc = resources.find(r => r.terraformModule === "networking/vpc");
						if (vpc && !resource.dependencies.includes(vpc.id)) {
							resource.dependencies.push(vpc.id);
							resource.configuration._vpc_reference = vpc.id;
						}
					}
					break;

				case "networking/internet-gateway":
				case "security/security-group":
				case "networking/route-table":
					// These need VPC
					if (!resource.configuration.vpc_id && !resource.configuration._vpc_reference) {
						const vpc = resources.find(r => r.terraformModule === "networking/vpc");
						if (vpc && !resource.dependencies.includes(vpc.id)) {
							resource.dependencies.push(vpc.id);
							resource.configuration._vpc_reference = vpc.id;
						}
					}
					break;

				case "networking/nat-gateway":
					// NAT needs public subnet
					if (!resource.configuration.subnet_id && !resource.configuration._subnet_reference) {
						const publicSubnet = resources.find(r =>
							r.terraformModule === "networking/subnet" &&
							(r.configuration.subnet_type === "public" ||
							 r.resourceType.includes("public"))
						);
						if (publicSubnet && !resource.dependencies.includes(publicSubnet.id)) {
							resource.dependencies.push(publicSubnet.id);
							resource.configuration._subnet_reference = publicSubnet.id;
						}
					}
					break;

				case "compute/ec2":
					// EC2 needs subnet
					if (!resource.configuration.subnet_id && !resource.configuration._subnet_reference) {
						const subnet = resources.find(r => r.terraformModule === "networking/subnet");
						if (subnet && !resource.dependencies.includes(subnet.id)) {
							resource.dependencies.push(subnet.id);
							resource.configuration._subnet_reference = subnet.id;
						}
					}
					// EC2 needs security group
					if ((!resource.configuration.security_group_ids ||
						 resource.configuration.security_group_ids.length === 0) &&
						!resource.configuration._security_group_references) {
						const sg = resources.find(r => r.terraformModule === "security/security-group");
						if (sg && !resource.dependencies.includes(sg.id)) {
							resource.dependencies.push(sg.id);
							resource.configuration._security_group_references = [sg.id];
						}
					}
					break;
			}
		}
	}

	// ============================================================================
	// TOPOLOGICAL SORT
	// ============================================================================

	/**
	 * Topological sort for dependency ordering
	 */
	private static topologicalSort(resources: NormalizedResource[]): string[] {
		const sorted: string[] = [];
		const visited = new Set<string>();
		const visiting = new Set<string>();
		const resourceMap = new Map(resources.map(r => [r.id, r]));

		const visit = (resourceId: string): void => {
			if (visited.has(resourceId)) return;
			if (visiting.has(resourceId)) {
				logger.warn(`Circular dependency detected at ${resourceId}`, {
					category: LogCategory.ARCHITECTURE,
				});
				return;
			}

			visiting.add(resourceId);

			const resource = resourceMap.get(resourceId);
			if (resource) {
				for (const depId of resource.dependencies) {
					visit(depId);
				}
			}

			visiting.delete(resourceId);
			visited.add(resourceId);
			sorted.push(resourceId);
		};

		// Visit all resources
		for (const resource of resources) {
			visit(resource.id);
		}

		return sorted;
	}

	// ============================================================================
	// MODULE REFERENCE MAP
	// ============================================================================

	/**
	 * Build module reference map for cross-resource linking
	 */
	private static buildModuleReferenceMap(resources: NormalizedResource[]): Map<string, ModuleReference> {
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

	// ============================================================================
	// CROSS-REFERENCE RESOLUTION
	// ============================================================================

	/**
	 * Check if a value looks like a node ID that needs resolution
	 */
	private static isNodeId(value: any): boolean {
		if (typeof value !== "string") return false;
		// Node IDs look like "aws-vpc-abc123", "aws-ec2-xyz789", "aws-security-group-def456"
		// Pattern: aws- followed by resource type (letters, digits, hyphens) followed by - and unique ID
		return value.match(/^aws-[a-z0-9-]+-[a-z0-9]+$/i) !== null;
	}

	/**
	 * Resolve a node ID to its module reference
	 */
	private static resolveNodeIdToModuleRef(
		nodeId: string,
		outputName: string,
		moduleReferenceMap: Map<string, ModuleReference>
	): string {
		const ref = moduleReferenceMap.get(nodeId);
		if (ref) {
			return ref.outputs[outputName] || `module.${ref.moduleName}.${outputName}`;
		}
		return nodeId; // Return original if not found
	}

	/**
	 * Resolve cross-resource references using the module reference map
	 * Handles both internal markers (_vpc_reference) and direct node ID values
	 */
	private static resolveCrossReferences(
		resources: NormalizedResource[],
		moduleReferenceMap: Map<string, ModuleReference>
	): void {
		for (const resource of resources) {
			const config = resource.configuration;

			// Resolve VPC reference (internal marker)
			if (config._vpc_reference) {
				config.vpc_id = this.resolveNodeIdToModuleRef(config._vpc_reference, "vpc_id", moduleReferenceMap);
				delete config._vpc_reference;
			}
			// Resolve direct vpc_id if it's a node ID
			else if (config.vpc_id && this.isNodeId(config.vpc_id)) {
				config.vpc_id = this.resolveNodeIdToModuleRef(config.vpc_id, "vpc_id", moduleReferenceMap);
			}

			// Resolve subnet reference (internal marker)
			if (config._subnet_reference) {
				config.subnet_id = this.resolveNodeIdToModuleRef(config._subnet_reference, "subnet_id", moduleReferenceMap);
				delete config._subnet_reference;
			}
			// Resolve direct subnet_id if it's a node ID
			else if (config.subnet_id && this.isNodeId(config.subnet_id)) {
				config.subnet_id = this.resolveNodeIdToModuleRef(config.subnet_id, "subnet_id", moduleReferenceMap);
			}

			// Resolve security group references (internal marker)
			if (config._security_group_references && Array.isArray(config._security_group_references)) {
				config.security_group_ids = config._security_group_references.map((sgId: string) =>
					this.resolveNodeIdToModuleRef(sgId, "security_group_id", moduleReferenceMap)
				);
				delete config._security_group_references;
			}
			// Resolve direct security_group_ids if they are node IDs
			else if (config.security_group_ids && Array.isArray(config.security_group_ids)) {
				config.security_group_ids = config.security_group_ids.map((sgId: string) =>
					this.isNodeId(sgId) ? this.resolveNodeIdToModuleRef(sgId, "security_group_id", moduleReferenceMap) : sgId
				);
			}
			// Also handle security_groups field (alternative name)
			if (config.security_groups && Array.isArray(config.security_groups)) {
				config.security_group_ids = config.security_groups.map((sgId: string) =>
					this.isNodeId(sgId) ? this.resolveNodeIdToModuleRef(sgId, "security_group_id", moduleReferenceMap) : sgId
				);
				delete config.security_groups;
			}

			// For subnets
			if (resource.terraformModule === "networking/subnet") {
				// Check if there's a separate RouteTable resource in the architecture
				const hasRouteTableResource = resources.some(r => r.terraformModule === "networking/route-table");
				if (hasRouteTableResource) {
					// Disable subnet's internal route table creation when there's a separate RouteTable
					config.create_route_table = false;
					config.create_igw_route = false;
					config.create_nat_route = false;
				}

				// For public subnets, add internet_gateway_id if needed (for internal route table)
				if (config.subnet_type === "public" && config.create_route_table !== false) {
					if (!config.internet_gateway_id || this.isNodeId(config.internet_gateway_id)) {
						const igw = resources.find(r => r.terraformModule === "networking/internet-gateway");
						if (igw) {
							const ref = moduleReferenceMap.get(igw.id);
							if (ref) {
								config.internet_gateway_id = ref.outputs.internet_gateway_id || `module.${ref.moduleName}.internet_gateway_id`;
							}
						}
					}
				}
			}

			// Resolve gateway references in route tables
			if (resource.terraformModule === "networking/route-table") {
				// Find internet gateway and set up route if not already configured
				if (!config.routes || Object.keys(config.routes).length === 0) {
					const igw = resources.find(r => r.terraformModule === "networking/internet-gateway");
					const subnet = resources.find(r => r.terraformModule === "networking/subnet");

					if (igw) {
						const igwRef = moduleReferenceMap.get(igw.id);
						if (igwRef) {
							config.routes = {
								internet: {
									destination_cidr_block: "0.0.0.0/0",
									gateway_id: igwRef.outputs.internet_gateway_id || `module.${igwRef.moduleName}.internet_gateway_id`
								}
							};
						}
					}

					// Set up subnet association
					if (subnet && (!config.associations || Object.keys(config.associations).length === 0)) {
						const subnetRef = moduleReferenceMap.get(subnet.id);
						if (subnetRef) {
							config.associations = {
								subnet: {
									subnet_id: subnetRef.outputs.subnet_id || `module.${subnetRef.moduleName}.subnet_id`
								}
							};
						}
					}
				} else {
					// Resolve existing routes
					for (const [_routeKey, route] of Object.entries(config.routes as Record<string, any>)) {
						if (route.gateway_id && this.isNodeId(route.gateway_id)) {
							route.gateway_id = this.resolveNodeIdToModuleRef(route.gateway_id, "internet_gateway_id", moduleReferenceMap);
						}
						if (route.nat_gateway_id && this.isNodeId(route.nat_gateway_id)) {
							route.nat_gateway_id = this.resolveNodeIdToModuleRef(route.nat_gateway_id, "nat_gateway_id", moduleReferenceMap);
						}
					}
				}

				// Resolve subnet associations
				if (config.associations) {
					for (const [_assocKey, assoc] of Object.entries(config.associations as Record<string, any>)) {
						if (assoc.subnet_id && this.isNodeId(assoc.subnet_id)) {
							assoc.subnet_id = this.resolveNodeIdToModuleRef(assoc.subnet_id, "subnet_id", moduleReferenceMap);
						}
					}
				}
			}
		}
	}

	// ============================================================================
	// VALIDATION
	// ============================================================================

	/**
	 * Validate the normalized architecture
	 */
	private static validateArchitecture(
		resources: NormalizedResource[],
		_connections: NormalizedConnection[],
		_metadata: NormalizedMetadata
	): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];

		// Validate individual resources
		for (const resource of resources) {
			const resourceValidation = this.validateResource(resource, resources);
			errors.push(...resourceValidation.errors);
			warnings.push(...resourceValidation.warnings);
		}

		// Validate for circular dependencies
		const circularCheck = this.checkCircularDependencies(resources);
		errors.push(...circularCheck.errors);

		// Validate architecture patterns
		const patternWarnings = this.validateArchitecturePatterns(resources);
		warnings.push(...patternWarnings);

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Validate a single resource
	 */
	private static validateResource(
		resource: NormalizedResource,
		_allResources: NormalizedResource[]
	): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];

		// Check required fields per module type
		const requiredFields = this.getRequiredFields(resource.terraformModule);
		for (const field of requiredFields) {
			if (!(field in resource.configuration) || resource.configuration[field] === undefined) {
				// Check if it's a reference that was resolved
				const isResolved = resource.configuration[field]?.toString().startsWith("module.");
				if (!isResolved) {
					errors.push({
						type: "missing_required",
						nodeId: resource.id,
						field,
						message: `Required field '${field}' is missing for ${resource.resourceType}`,
					});
				}
			}
		}

		// CIDR validation for networking resources
		if (resource.terraformModule.startsWith("networking/")) {
			if (resource.configuration.cidr_block && !this.isValidCidr(resource.configuration.cidr_block)) {
				errors.push({
					type: "configuration_error",
					nodeId: resource.id,
					field: "cidr_block",
					message: `Invalid CIDR block format: ${resource.configuration.cidr_block}`,
				});
			}
		}

		// Security group validation
		if (resource.terraformModule === "security/security-group") {
			const ingressRules = resource.configuration.ingress_rules || [];
			for (const rule of ingressRules) {
				if (rule.cidr_blocks?.includes("0.0.0.0/0") &&
					rule.from_port !== 80 && rule.from_port !== 443) {
					warnings.push({
						type: "security",
						nodeId: resource.id,
						message: `Security group allows traffic from anywhere (0.0.0.0/0) on port ${rule.from_port}`,
					});
				}
			}
		}

		return { valid: errors.length === 0, errors, warnings };
	}

	/**
	 * Get required fields for a module type
	 */
	private static getRequiredFields(module: string): string[] {
		const requiredFieldsMap: Record<string, string[]> = {
			"networking/vpc": ["cidr_block"],
			"networking/subnet": ["cidr_block", "availability_zone"],
			"networking/internet-gateway": ["vpc_id"],
			"networking/route-table": ["vpc_id"],
			"compute/ec2": ["instance_type"],
			"security/security-group": ["name"],
			"storage/s3": ["bucket_name"],
		};
		return requiredFieldsMap[module] || [];
	}

	/**
	 * Validate CIDR format
	 */
	private static isValidCidr(cidr: string): boolean {
		const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
		return cidrRegex.test(cidr);
	}

	/**
	 * Check for circular dependencies
	 */
	private static checkCircularDependencies(resources: NormalizedResource[]): { errors: ValidationError[] } {
		const errors: ValidationError[] = [];
		const visited = new Set<string>();
		const recursionStack = new Set<string>();
		const resourceMap = new Map(resources.map(r => [r.id, r]));

		const hasCycle = (resourceId: string): boolean => {
			if (recursionStack.has(resourceId)) return true;
			if (visited.has(resourceId)) return false;

			visited.add(resourceId);
			recursionStack.add(resourceId);

			const resource = resourceMap.get(resourceId);
			if (resource) {
				for (const depId of resource.dependencies) {
					if (hasCycle(depId)) return true;
				}
			}

			recursionStack.delete(resourceId);
			return false;
		};

		for (const resource of resources) {
			visited.clear();
			recursionStack.clear();
			if (hasCycle(resource.id)) {
				errors.push({
					type: "invalid_dependency",
					nodeId: resource.id,
					message: `Circular dependency detected involving ${resource.resourceType} ${resource.id}`,
				});
			}
		}

		return { errors };
	}

	/**
	 * Validate architecture patterns and best practices
	 */
	private static validateArchitecturePatterns(resources: NormalizedResource[]): ValidationWarning[] {
		const warnings: ValidationWarning[] = [];

		// Check for missing VPC
		const hasVpc = resources.some(r => r.terraformModule === "networking/vpc");
		if (!hasVpc && resources.some(r => r.terraformModule.startsWith("networking/"))) {
			warnings.push({
				type: "best_practice",
				message: "Consider using a VPC for better network isolation",
			});
		}

		// Check for EC2 without security groups
		const ec2Resources = resources.filter(r => r.terraformModule === "compute/ec2");
		const hasSecurityGroups = resources.some(r => r.terraformModule === "security/security-group");
		if (ec2Resources.length > 0 && !hasSecurityGroups) {
			warnings.push({
				type: "security",
				message: "EC2 instances should be associated with security groups",
			});
		}

		return warnings;
	}
}
