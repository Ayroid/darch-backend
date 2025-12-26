import {
	ArchitectureData,
	ArchitectureResource,
	ArchitectureMetadata,
	NodeConnection,
	FrontendResource,
	FrontendArchitectureData,
	FrontendArchitectureMetadata,
	FrontendVPCConfiguration,
	FrontendEC2Configuration,
	FrontendSubnetConfiguration,
	FrontendSecurityGroupConfiguration,
	FrontendInternetGatewayConfiguration,
	FrontendNATGatewayConfiguration,
	FrontendRouteTableConfiguration,
	FrontendS3Configuration,
	FrontendRDSConfiguration,
	FrontendAWSResourceConfiguration,
	FRONTEND_TO_BACKEND_RESOURCE_TYPE_MAP,
	FrontendConnection,
	RouteTableAssociation,
	ResourceMapping,
	TransformationResult,
	TransformationSummary,
} from "../models/Architecture.js";
import { logger, LogCategory, LogLevel } from "../utils/Logger.js";

/**
 * Service responsible for transforming frontend architecture data to backend format
 *
 * This service acts as a data validation and normalization layer between the frontend
 * and backend. It ensures that all required fields exist with proper defaults, converts
 * data structures to backend-compatible formats, and resolves resource references.
 *
 * Key responsibilities:
 * - Validate and normalize resource configurations
 * - Set required defaults for missing fields
 * - Convert frontend resource types to backend types
 * - Resolve parent-child relationships and resource references
 * - Ensure data structure compatibility with Terraform generators
 *
 * @class FrontendArchitectureTransformerService
 */
export class FrontendArchitectureTransformerService {
	/**
	 * Transform frontend architecture data to backend format
	 *
	 * Main entry point for transforming frontend architecture data. Validates, normalizes,
	 * and converts frontend resource definitions into backend-compatible format ready for
	 * Terraform code generation.
	 *
	 * @param {FrontendArchitectureData} frontendData - The architecture data from frontend
	 * @param {FrontendArchitectureMetadata} frontendData.metadata - Project metadata (name, version, provider, etc.)
	 * @param {FrontendResource[]} frontendData.resources - Array of AWS resources to transform
	 * @param {any[]} frontendData.connections - Resource connections/dependencies
	 * @param {Record<string, any>} frontendData.variables - Terraform variables
	 * @param {Record<string, any>} frontendData.outputs - Terraform outputs
	 *
	 * @returns {TransformationResult} Result containing transformed data, warnings, errors, and mappings
	 * @returns {ArchitectureData} result.transformed - Backend-formatted architecture data
	 * @returns {string[]} result.warnings - Non-critical issues (e.g., missing optional fields)
	 * @returns {string[]} result.errors - Critical errors that prevented transformation
	 * @returns {ResourceMapping[]} result.mappings - Resource ID mappings with transformation details
	 */
	static transformToBackendFormat(
		frontendData: FrontendArchitectureData
	): TransformationResult {
		const startTime = Date.now();

		const frontendResources = frontendData.resources || [];
		const frontendMetadata = frontendData.metadata || {};

		logger.architecture(LogLevel.INFO, "Transforming frontend architecture", {
			resources: frontendResources.length,
			connections: frontendData.connections?.length || 0,
		});

		const warnings: string[] = [];
		const errors: string[] = [];
		const mappings: ResourceMapping[] = [];

		try {
			// Transform components
			const transformedMetadata = this.transformMetadata(frontendMetadata);

			// Transform nodes
			const { transformedResources, resourceWarnings, resourceMappings } =
				this.transformResources(frontendResources, warnings, errors);
			warnings.push(...resourceWarnings);
			mappings.push(...resourceMappings);

			// Transform connections
			const { transformedConnections, connectionWarnings } =
				this.transformConnections(
					frontendData.connections || [],
					transformedResources,
					warnings
				);
			warnings.push(...connectionWarnings);

			const transformed: ArchitectureData = {
				metadata: transformedMetadata,
				resources: transformedResources,
				connections: transformedConnections,
				variables: frontendData.variables || {},
				outputs: frontendData.outputs || {},
			};

			const duration = Date.now() - startTime;

			logger.architecture(LogLevel.INFO, "Frontend transformation completed", {
				transformedResources: transformedResources,
				resources: transformedResources.length,
				warnings: warnings.length,
				errors: errors.length,
				duration,
			});

			return {
				transformed,
				warnings,
				errors,
				mappings,
			};
		} catch (error) {
			const errorMessage = `Failed to transform architecture data: ${
				error instanceof Error ? error.message : "Unknown error"
			}`;
			errors.push(errorMessage);
			logger.error("Architecture transformation failed", {
				error: errorMessage,
				category: LogCategory.ARCHITECTURE,
			});

			return {
				transformed: {
					metadata: {
						name: "Empty Architecture",
						description: "Failed to transform architecture",
						version: "1.0.0",
						created_at: new Date().toISOString(),
						last_modified: new Date().toISOString(),
						provider: "aws",
					},
					resources: [],
					connections: [],
					variables: {},
					outputs: {},
				},
				warnings,
				errors,
				mappings,
			};
		}
	}

	/**
	 * Transform metadata from frontend to backend format
	 *
	 * Converts frontend architecture metadata to backend format, ensuring all required
	 * fields exist with sensible defaults.
	 *
	 * @param {FrontendArchitectureMetadata} frontendMetadata - Frontend metadata object
	 * @param {string} frontendMetadata.name - Project name
	 * @param {string} frontendMetadata.description - Project description
	 * @param {string} frontendMetadata.version - Project version
	 * @param {string} frontendMetadata.provider - Cloud provider (e.g., 'aws')
	 *
	 * @returns {ArchitectureMetadata} Transformed metadata with defaults applied
	 */
	private static transformMetadata(
		frontendMetadata: FrontendArchitectureMetadata
	): ArchitectureMetadata {
		const transformed: ArchitectureMetadata = {
			name: frontendMetadata.name || "Untitled Architecture",
			description: frontendMetadata.description || "",
			version: frontendMetadata.version || "1.0.0",
			created_at: frontendMetadata.created_at || new Date().toISOString(),
			last_modified: frontendMetadata.last_modified || new Date().toISOString(),
			provider: frontendMetadata.provider || "aws",
		};

		// Extract additional properties that might be useful
		transformed.environment = frontendMetadata.environment || undefined;
		transformed.project = frontendMetadata.project || undefined;
		transformed.tags = frontendMetadata.tags || undefined;

		return transformed;
	}

	/**
	 * Transform resources from frontend to backend format
	 *
	 * Processes frontend resources, separating container resources (VPCs, Subnets as containers)
	 * from service resources (EC2, S3, RDS). Applies resource-specific transformations,
	 * validates configurations, and resolves parent-child relationships.
	 *
	 * @param {FrontendResource[]} frontendResources - Array of frontend resources to transform
	 * @param {string[]} warnings - Array to accumulate non-critical warnings
	 * @param {string[]} errors - Array to accumulate critical errors
	 *
	 * @returns {Object} Transformation result with resources, warnings, and mappings
	 * @returns {ArchitectureResource[]} result.transformedResources - Backend-formatted resources
	 * @returns {string[]} result.resourceWarnings - Warnings generated during resource transformation
	 * @returns {ResourceMapping[]} result.resourceMappings - ID mappings and transformation logs
	 */
	private static transformResources(
		frontendResources: FrontendResource[],
		warnings: string[],
		errors: string[]
	): {
		transformedResources: ArchitectureResource[];
		resourceWarnings: string[];
		resourceMappings: ResourceMapping[];
	} {
		const transformedResources: ArchitectureResource[] = [];
		const resourceWarnings: string[] = [];
		const resourceMappings: ResourceMapping[] = [];

		// Filter out container resources and keep only service resources for backend
		const serviceResources = frontendResources.filter(
			(resource) => resource.node_type === "aws_service"
		);

		const containerResources = frontendResources.filter(
			(resource) => resource.node_type === "aws_container"
		);

		// Service Resources Examples - EC2, S3, RDS, etc.
		// Container Resources Examples - VPCs, Subnets, Regions, Availability Zones, etc.

		// Create a mapping of container resources for reference resolution (vpc_id, subnet_id, etc.)
		const containerMapping: Map<string, FrontendResource> = new Map(
			containerResources.map((resource) => [resource.id, resource])
		);

		// Combine service resources and convertible container resources (VPCs, Subnets) into single array
		const convertibleTypes = [
			"aws-vpc",
			"aws-subnet",
			"aws-public-subnet",
			"aws-private-subnet",
			"aws-security-group",
		];
		const convertibleContainers = containerResources.filter((resource) =>
			convertibleTypes.includes(resource.resource_type)
		);
		const resourcesToTransform = [
			...serviceResources,
			...convertibleContainers,
		];

		// Process all resources in a single loop
		for (const frontendResource of resourcesToTransform) {
			try {
				const transformations: string[] = [];

				// Track if this was originally a container resource
				if (frontendResource.node_type === "aws_container") {
					transformations.push("Converted from container to service");
				}

				// Transform resource type from frontend format to backend format
				// aws-vpc → vpc, aws-ec2 → ec2, etc.
				const { resourceType } = this.mapResourceType(
					frontendResource.resource_type,
					transformations
				);

				// Transform configuration
				const transformedConfig = this.transformNodeConfiguration(
					frontendResource,
					containerMapping,
					transformations,
					resourceWarnings
				);

				const transformedResource: ArchitectureResource = {
					id: frontendResource.id,
					resource_type: resourceType,
					name: frontendResource.name || frontendResource.id,
					configuration: transformedConfig,
					parent_id: frontendResource.parent_id,
				};

				transformedResources.push(transformedResource);

				// Record mapping
				resourceMappings.push({
					frontendId: frontendResource.id,
					backendId: frontendResource.id,
					resourceType: resourceType,
					transformations,
				});
			} catch (error) {
				const errorMessage = `Failed to transform resource ${
					frontendResource.id
				}: ${error instanceof Error ? error.message : "Unknown error"}`;
				errors.push(errorMessage);
				logger.error("Resource transformation failed", {
					error: errorMessage,
					nodeId: frontendResource.id,
					category: LogCategory.ARCHITECTURE,
				});
			}
		}

		return {
			transformedResources,
			resourceWarnings,
			resourceMappings,
		};
	}

	/**
	 * Map frontend resource type to backend resource type
	 *
	 * Converts frontend resource type identifiers (e.g., 'aws-vpc', 'aws-ec2') to
	 * backend format (e.g., 'vpc', 'ec2') using the predefined mapping.
	 *
	 * @param {string} frontendResourceType - Frontend resource type (e.g., 'aws-vpc', 'aws-ec2')
	 * @param {string[]} transformations - Array to log transformation operations
	 *
	 * @returns {Object} Mapped resource type
	 * @returns {string} result.resourceType - Backend resource type identifier
	 */
	private static mapResourceType(
		frontendResourceType: string,
		transformations: string[]
	): {
		resourceType: string;
	} {
		const resourceType =
			FRONTEND_TO_BACKEND_RESOURCE_TYPE_MAP[frontendResourceType.toLowerCase()];

		if (resourceType) return { resourceType };

		// Default fallback
		transformations.push(
			`Unknown resource type ${frontendResourceType}, using as-is`
		);
		return {
			resourceType: frontendResourceType,
		};
	}

	/**
	 * Transform resource configuration from frontend to backend format
	 *
	 * Validates and normalizes resource configurations based on resource type.
	 * Ensures all required fields exist with proper defaults, converts data structures
	 * to backend-compatible formats, and resolves resource references.
	 *
	 * This acts as a safety layer - even if frontend sends correct data, this ensures
	 * robustness against version mismatches, client bugs, or future API consumers.
	 *
	 * @param {FrontendResource} frontendResource - The resource to transform
	 * @param {Map<string, FrontendResource>} containerMapping - Map of container resources for reference resolution
	 * @param {string[]} transformations - Array to log transformation operations
	 * @param {string[]} warnings - Array to log non-critical issues
	 *
	 * @returns {FrontendAWSResourceConfiguration & Record<string, any>} Validated and normalized configuration
	 */
	private static transformNodeConfiguration(
		frontendResource: FrontendResource,
		containerMapping: Map<string, FrontendResource>,
		transformations: string[],
		warnings: string[]
	): FrontendAWSResourceConfiguration & Record<string, any> {
		const config = {
			...frontendResource.configuration,
		} as FrontendAWSResourceConfiguration & Record<string, any>;

		console.log(
			"-----------------------------Frontend Resource-----------------------------",
			frontendResource.resource_type
		);

		// Transform specific configuration based on resource type
		switch (frontendResource.resource_type) {
			case "aws-vpc":
				this.transformVpcConfiguration(
					config as FrontendVPCConfiguration,
					transformations
				);
				break;
			case "aws-subnet":
				this.transformSubnetConfiguration(
					config as FrontendSubnetConfiguration & Record<string, any>,
					frontendResource,
					containerMapping,
					transformations
				);
				break;
			case "aws-ec2":
				this.transformEc2Configuration(
					config as FrontendEC2Configuration & Record<string, any>,
					frontendResource,
					containerMapping,
					transformations
				);
				break;
			case "aws-security-group":
				this.transformSecurityGroupConfiguration(
					config as FrontendSecurityGroupConfiguration & Record<string, any>,
					transformations
				);
				break;
			case "aws-internet-gateway":
				this.transformInternetGatewayConfiguration(
					config as FrontendInternetGatewayConfiguration & Record<string, any>,
					frontendResource,
					containerMapping,
					transformations
				);
				break;
			case "aws-nat-gateway":
				this.transformNatGatewayConfiguration(
					config as FrontendNATGatewayConfiguration & Record<string, any>,
					frontendResource,
					containerMapping,
					transformations
				);
				break;
			case "aws-route-table":
				this.transformRouteTableConfiguration(
					config as FrontendRouteTableConfiguration & Record<string, any>,
					frontendResource,
					containerMapping,
					transformations
				);
				break;
			case "aws-s3":
				this.transformS3Configuration(
					config as FrontendS3Configuration & Record<string, any>,
					transformations
				);
				break;
			case "aws-rds":
				this.transformRdsConfiguration(
					config as FrontendRDSConfiguration & Record<string, any>,
					transformations
				);
				break;
		}

		// Ensure tags exist
		if (!config.tags) {
			config.tags = {};
		}

		// Add resource identification tags
		config.tags.name = frontendResource.name;
		config.tags.resource_id = frontendResource.id;

		return config;
	}

	/**
	 * Validate and normalize VPC configuration
	 *
	 * Ensures required VPC fields exist with proper defaults:
	 * - enable_dns_support: defaults to true (required for most AWS services)
	 * - enable_dns_hostnames: defaults to false
	 *
	 * @param {FrontendVPCConfiguration} config - VPC configuration to validate
	 * @param {string[]} transformations - Array to log applied transformations
	 * @returns {void} Modifies config in place
	 */
	private static transformVpcConfiguration(
		config: FrontendVPCConfiguration,
		transformations: string[]
	): void {
		if (config.enable_dns_support === undefined) {
			config.enable_dns_support = true;
			transformations.push("Set enable_dns_support to true");
		}
		if (config.enable_dns_hostnames === undefined) {
			config.enable_dns_hostnames = false;
		}
	}

	/**
	 * Validate and normalize subnet configuration
	 *
	 * Ensures:
	 * - subnet_type is set based on resource type (public/private)
	 * - vpc_id reference is resolved from parent container if not explicitly set
	 *
	 * @param {FrontendSubnetConfiguration & Record<string, any>} config - Subnet configuration to validate
	 * @param {FrontendResource} frontendResource - The frontend resource being transformed
	 * @param {Map<string, FrontendResource>} containerMapping - Container resources for VPC resolution
	 * @param {string[]} transformations - Array to log applied transformations
	 * @returns {void} Modifies config in place
	 */
	private static transformSubnetConfiguration(
		config: FrontendSubnetConfiguration & Record<string, any>,
		frontendResource: FrontendResource,
		containerMapping: Map<string, FrontendResource>,
		transformations: string[]
	): void {
		if (!config.subnet_type) {
			config.subnet_type = frontendResource.resource_type.includes("public")
				? "public"
				: "private";
			transformations.push(`Set subnet_type: ${config.subnet_type}`);
		}

		// Find VPC reference from parent if needed
		if (!config.vpc_id && frontendResource.parent_id) {
			const vpc = this.findVpcForNode(frontendResource, containerMapping);
			if (vpc) {
				config.vpc_id = vpc.id;
				transformations.push(`Added VPC reference from parent: ${vpc.id}`);
			}
		}
	}

	/**
	 * Validate and normalize EC2 instance configuration
	 *
	 * Ensures:
	 * - root_block_device exists with defaults (8GB gp3 volume)
	 * - ebs_block_device array is initialized
	 * - security_group_ids array is initialized
	 * - subnet_id reference is resolved from parent container if not set
	 *
	 * @param {FrontendEC2Configuration & Record<string, any>} config - EC2 configuration to validate
	 * @param {FrontendResource} frontendResource - The frontend resource being transformed
	 * @param {Map<string, FrontendResource>} containerMapping - Container resources for subnet resolution
	 * @param {string[]} transformations - Array to log applied transformations
	 * @returns {void} Modifies config in place
	 */
	private static transformEc2Configuration(
		config: FrontendEC2Configuration & Record<string, any>,
		frontendResource: FrontendResource,
		containerMapping: Map<string, FrontendResource>,
		transformations: string[]
	): void {
		// Frontend now sends snake_case - minimal transformation needed

		// Set default root_block_device if not present
		if (!config.root_block_device) {
			config.root_block_device = {
				volume_size: 8,
				volume_type: "gp3",
				delete_on_termination: true,
				encrypted: false,
			};
			transformations.push("Set default root_block_device");
		}

		// Initialize ebs_block_device array if not present
		if (!config.ebs_block_device) {
			config.ebs_block_device = [];
		}

		// Initialize security_group_ids array if not present
		if (!config.security_group_ids) {
			config.security_group_ids = [];
		}

		// Find subnet reference from parent if needed
		if (!config.subnet_id && frontendResource.parent_id) {
			const parent = containerMapping.get(frontendResource.parent_id);
			if (parent && parent.resource_type.includes("subnet")) {
				config.subnet_id = parent.id;
				transformations.push(
					`Added subnet reference from parent: ${parent.id}`
				);
			}
		}
	}

	/**
	 * Validate and normalize security group configuration
	 *
	 * Ensures:
	 * - description field exists with default value
	 * - ingress_rules array is initialized
	 * - egress_rules array is initialized
	 *
	 * @param {FrontendSecurityGroupConfiguration & Record<string, any>} config - Security group configuration
	 * @param {string[]} transformations - Array to log applied transformations
	 * @returns {void} Modifies config in place
	 */
	private static transformSecurityGroupConfiguration(
		config: FrontendSecurityGroupConfiguration & Record<string, any>,
		transformations: string[]
	): void {
		// Frontend now sends snake_case - minimal transformation needed

		// Set default description if missing
		if (!config.name && !config.description) {
			config.description = "Security group created by Darch";
			transformations.push("Set default description");
		}

		// Ensure ingress_rules and egress_rules arrays exist
		if (!config.ingress_rules) {
			config.ingress_rules = [];
		}
		if (!config.egress_rules) {
			config.egress_rules = [];
		}
	}

	/**
	 * Validate and normalize S3 bucket configuration
	 *
	 * Currently performs minimal validation as frontend sends correct format.
	 * Kept as placeholder for future validation requirements.
	 *
	 * @param {FrontendS3Configuration & Record<string, any>} config - S3 configuration
	 * @param {string[]} transformations - Array to log applied transformations
	 * @returns {void} Modifies config in place
	 */
	private static transformS3Configuration(
		config: FrontendS3Configuration & Record<string, any>,
		transformations: string[]
	): void {
		// Frontend now sends snake_case - minimal transformation needed
		// Configuration is already in correct format
	}

	/**
	 * Validate and normalize RDS database configuration
	 *
	 * Currently performs minimal validation as frontend sends correct format.
	 * Kept as placeholder for future validation requirements.
	 *
	 * @param {FrontendRDSConfiguration & Record<string, any>} config - RDS configuration
	 * @param {string[]} transformations - Array to log applied transformations
	 * @returns {void} Modifies config in place
	 */
	private static transformRdsConfiguration(
		config: FrontendRDSConfiguration & Record<string, any>,
		transformations: string[]
	): void {
		// Frontend now sends snake_case - minimal transformation needed
		// Configuration is already in correct format
	}

	/**
	 * Validate and normalize Internet Gateway configuration
	 *
	 * Currently performs minimal validation as frontend sends correct format.
	 * Kept as placeholder for future validation requirements.
	 *
	 * @param {FrontendInternetGatewayConfiguration & Record<string, any>} config - IGW configuration
	 * @param {FrontendResource} frontendResource - The frontend resource being transformed
	 * @param {Map<string, FrontendResource>} containerMapping - Container resources for reference
	 * @param {string[]} transformations - Array to log applied transformations
	 * @returns {void} Modifies config in place
	 */
	private static transformInternetGatewayConfiguration(
		config: FrontendInternetGatewayConfiguration & Record<string, any>,
		frontendResource: FrontendResource,
		containerMapping: Map<string, FrontendResource>,
		transformations: string[]
	): void {
		// Frontend now sends snake_case - minimal transformation needed
		// Configuration is already in correct format
	}

	/**
	 * Validate and normalize NAT Gateway configuration
	 *
	 * Ensures:
	 * - connectivity_type defaults to 'public'
	 * - create_eip is set to true for public NAT Gateways without allocation_id
	 *
	 * @param {FrontendNATGatewayConfiguration & Record<string, any>} config - NAT Gateway configuration
	 * @param {FrontendResource} frontendResource - The frontend resource being transformed
	 * @param {Map<string, FrontendResource>} containerMapping - Container resources for reference
	 * @param {string[]} transformations - Array to log applied transformations
	 * @returns {void} Modifies config in place
	 */
	private static transformNatGatewayConfiguration(
		config: FrontendNATGatewayConfiguration & Record<string, any>,
		frontendResource: FrontendResource,
		containerMapping: Map<string, FrontendResource>,
		transformations: string[]
	): void {
		// Frontend now sends snake_case - minimal transformation needed

		// Set default connectivity_type if not specified
		if (!config.connectivity_type) {
			config.connectivity_type = "public";
			transformations.push("Set default connectivity_type: public");
		}

		// Set default create_eip if connectivity is public and no allocation_id
		if (
			config.connectivity_type === "public" &&
			!config.allocation_id &&
			config.create_eip === undefined
		) {
			config.create_eip = true;
			transformations.push(
				"Set default create_eip: true for public NAT Gateway"
			);
		}
	}

	/**
	 * Validate and normalize Route Table configuration
	 *
	 * Ensures:
	 * - routes field is a map (not array)
	 * - associations field is a map (converts from array if needed)
	 *
	 * Backend requires map structure for Terraform compatibility.
	 *
	 * @param {FrontendRouteTableConfiguration & Record<string, any>} config - Route table configuration
	 * @param {FrontendResource} frontendResource - The frontend resource being transformed
	 * @param {Map<string, FrontendResource>} containerMapping - Container resources for reference
	 * @param {string[]} transformations - Array to log applied transformations
	 * @returns {void} Modifies config in place
	 */
	private static transformRouteTableConfiguration(
		config: FrontendRouteTableConfiguration & Record<string, any>,
		frontendResource: FrontendResource,
		containerMapping: Map<string, FrontendResource>,
		transformations: string[]
	): void {
		// Frontend now sends snake_case - minimal transformation needed

		// Ensure routes is a map (not array)
		if (
			!config.routes ||
			typeof config.routes !== "object" ||
			Array.isArray(config.routes)
		) {
			config.routes = {};
			transformations.push("Initialized routes as empty map");
		}

		// Ensure associations is a map (not array)
		if (config.associations && Array.isArray(config.associations)) {
			// Convert array to map
			const associationsMap: Record<string, RouteTableAssociation> = {};
			config.associations.forEach(
				(assoc: RouteTableAssociation, index: number) => {
					const key = assoc.subnet_id
						? `subnet_${assoc.subnet_id}`
						: `association_${index}`;
					associationsMap[key] = assoc;
				}
			);
			config.associations = associationsMap;
			transformations.push("Converted associations array to map format");
		} else if (!config.associations) {
			config.associations = {};
			transformations.push("Initialized associations as empty map");
		}
	}

	/**
	 * Find VPC for a given resource by traversing parent containers
	 *
	 * Walks up the parent hierarchy to find the containing VPC. Used when resources
	 * don't explicitly specify vpc_id but need it for configuration.
	 *
	 * @param {FrontendResource} resource - The resource to find VPC for
	 * @param {Map<string, FrontendResource>} containerMapping - Map of container resources
	 *
	 * @returns {FrontendResource | undefined} The VPC resource if found, undefined otherwise
	 */
	private static findVpcForNode(
		resource: FrontendResource,
		containerMapping: Map<string, FrontendResource>
	): FrontendResource | undefined {
		let currentResource = resource;

		while (currentResource.parent_id) {
			const parent = containerMapping.get(currentResource.parent_id);
			if (!parent) break;

			if (parent.resource_type.includes("vpc")) {
				return parent;
			}

			currentResource = parent;
		}

		return undefined;
	}

	/**
	 * Transform connections from frontend to backend format
	 *
	 * Converts frontend connection definitions to backend format and validates that
	 * source and target resources exist. Only transforms explicit connections sent by
	 * frontend - does not create implicit connections from parent-child relationships
	 * as those are already captured via parent_id field.
	 *
	 * @param {FrontendConnection[]} frontendConnections - Array of frontend connection objects
	 * @param {ArchitectureResource[]} transformedResources - Already transformed resources
	 * @param {string[]} warnings - Array to accumulate warnings
	 *
	 * @returns {Object} Transformation result
	 * @returns {NodeConnection[]} result.transformedConnections - Backend-formatted connections
	 * @returns {string[]} result.connectionWarnings - Warnings from connection transformation
	 */
	private static transformConnections(
		frontendConnections: FrontendConnection[],
		transformedResources: ArchitectureResource[],
		warnings: string[]
	): {
		transformedConnections: NodeConnection[];
		connectionWarnings: string[];
	} {
		const transformedConnections: NodeConnection[] = [];
		const connectionWarnings: string[] = [];
		const resourceIds = new Set(transformedResources.map((r) => r.id));

		for (const frontendConnection of frontendConnections) {
			try {
				// Create basic connection structure
				const connection: NodeConnection = {
					id:
						frontendConnection.id ||
						`connection-${transformedConnections.length}`,
					source: frontendConnection.source,
					target: frontendConnection.target,
					sourceHandle: frontendConnection.source_handle,
					targetHandle: frontendConnection.target_handle,
					type: frontendConnection.type,
				};

				// Validate that source and target resources exist
				if (!resourceIds.has(connection.source)) {
					connectionWarnings.push(
						`Connection source ${connection.source} not found in transformed resources`
					);
					continue;
				}

				if (!resourceIds.has(connection.target)) {
					connectionWarnings.push(
						`Connection target ${connection.target} not found in transformed resources`
					);
					continue;
				}

				transformedConnections.push(connection);
			} catch (error) {
				const errorMessage = `Failed to transform connection: ${
					error instanceof Error ? error.message : "Unknown error"
				}`;
				connectionWarnings.push(errorMessage);
			}
		}

		return {
			transformedConnections,
			connectionWarnings,
		};
	}

	/**
	 * Validate frontend architecture data structure
	 *
	 * Performs structural validation on frontend data before transformation.
	 * Checks for required fields and proper data types.
	 *
	 * @param {unknown} data - Frontend architecture data to validate (unknown type for runtime validation)
	 *
	 * @returns {Object} Validation result
	 * @returns {boolean} result.valid - True if data is valid, false otherwise
	 * @returns {string[]} result.errors - Critical validation errors
	 * @returns {string[]} result.warnings - Non-critical issues
	 */
	static validateFrontendData(data: unknown): {
		valid: boolean;
		errors: string[];
		warnings: string[];
	} {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (!data || typeof data !== 'object') {
			errors.push("Architecture data is required");
			return { valid: false, errors, warnings };
		}

		// Type guard: narrow unknown to a usable type
		const archData = data as Record<string, any>;

		if (!archData.metadata) {
			errors.push("Metadata is required");
		} else {
			if (!archData.metadata.name) {
				errors.push("Metadata name is required");
			}
			if (!archData.metadata.provider) {
				errors.push("Metadata provider is required");
			}
		}

		// Check resources
		if (!archData.resources || !Array.isArray(archData.resources)) {
			errors.push("Resources array is required");
		} else if (archData.resources.length === 0) {
			errors.push("At least one resource is required");
		}

		// Validate individual resources
		for (const [index, resource] of (archData.resources || []).entries()) {
			if (!resource.id) {
				errors.push(`Resource at index ${index} is missing id`);
			}
			if (!resource.resource_type) {
				errors.push(
					`Resource ${resource.id || index} is missing resource_type`
				);
				console.log("[VALIDATOR] Resource fields:", Object.keys(resource));
			}
			if (!resource.node_type) {
				errors.push(
					`Resource ${resource.id || index} is missing node_type`
				);
			}
		}

		console.log("[VALIDATOR] Validation complete:", {
			valid: errors.length === 0,
			errorsCount: errors.length,
			warningsCount: warnings.length,
		});

		if (errors.length > 0) {
			console.log("[VALIDATOR] ❌ Errors:", errors);
		}

		return { valid: errors.length === 0, errors, warnings };
	}

	/**
	 * Generate transformation summary
	 *
	 * Creates a statistical summary of the transformation process, including counts
	 * of resources by type, transformations applied, and any issues encountered.
	 *
	 * @param {TransformationResult} result - The transformation result to summarize
	 * @returns {TransformationSummary} Summary object with statistics
	 */
	static generateTransformationSummary(
		result: TransformationResult
	): TransformationSummary {
		const summary = {
			totalResources: result.transformed.resources.length,
			totalConnections: result.transformed.connections.length,
			resourceTypes: {} as Record<string, number>,
			transformations: {} as Record<string, number>,
			warningsCount: result.warnings.length,
			errorsCount: result.errors.length,
			mappings: result.mappings.length,
		};

		// Count resource types
		for (const resource of result.transformed.resources) {
			summary.resourceTypes[resource.resource_type] =
				(summary.resourceTypes[resource.resource_type] || 0) + 1;
		}

		// Count transformation types
		for (const mapping of result.mappings) {
			for (const transformation of mapping.transformations) {
				summary.transformations[transformation] =
					(summary.transformations[transformation] || 0) + 1;
			}
		}

		return summary;
	}
}
