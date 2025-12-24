import {
	ArchitectureData,
	ArchitectureResource,
	ArchitectureMetadata,
	NodeConnection,
	FrontendResource,
	FrontendArchitectureData,
	FrontendArchitectureMetadata,
	FrontendAWSRegionConfiguration,
	FrontendVPCConfiguration,
	FrontendEC2Configuration,
	FrontendSubnetConfiguration,
	FrontendSecurityGroupConfiguration,
	FrontendInternetGatewayConfiguration,
	FrontendNATGatewayConfiguration,
	FrontendRouteTableConfiguration,
} from "../models/Architecture.js";
import { logger, LogCategory, LogLevel } from "../utils/Logger.js";

export interface TransformationResult {
	transformed: ArchitectureData;
	warnings: string[];
	errors: string[];
	mappings: ResourceMapping[];
}

export interface ResourceMapping {
	frontendId: string;
	backendId: string;
	resourceType: string;
	transformations: string[];
}

export class FrontendArchitectureTransformerService {
	/**
	 * Transform frontend architecture data to backend format
	 */
	static transformToBackendFormat(
		frontendData: FrontendArchitectureData
	): TransformationResult {
		const startTime = Date.now();

		const frontendResources = frontendData.resources || [];
		const frontendMetadata = frontendData.metadata || {};

		console.log('[TRANSFORMER] Starting transformation');
		console.log('[TRANSFORMER] Frontend resources count:', frontendResources.length);
		if (frontendResources.length > 0) {
			console.log('[TRANSFORMER] Sample resource field names:', Object.keys(frontendResources[0]));
			console.log('[TRANSFORMER] Sample resource:', {
				id: frontendResources[0].id,
				node_type: frontendResources[0].node_type,
				resource_type: frontendResources[0].resource_type,
				name: frontendResources[0].name,
				parent_id: frontendResources[0].parent_id
			});
		}

		logger.architecture(LogLevel.INFO, "Transforming frontend architecture", {
			resources: frontendResources.length,
			connections: frontendData.connections?.length || 0,
		});

		const warnings: string[] = [];
		const errors: string[] = [];
		const mappings: ResourceMapping[] = [];

		try {
			// Transform components
			const transformedMetadata = this.transformMetadata(
				frontendMetadata
			);

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

			console.log('[TRANSFORMER] Transformation completed:');
			console.log('[TRANSFORMER] - Transformed resources:', transformedResources.length);
			console.log('[TRANSFORMER] - Warnings:', warnings.length);
			console.log('[TRANSFORMER] - Errors:', errors.length);
			console.log('[TRANSFORMER] - Duration:', duration, 'ms');
			if (transformedResources.length > 0) {
				console.log('[TRANSFORMER] First transformed resource:', JSON.stringify(transformedResources[0], null, 2));
			}
			if (warnings.length > 0) {
				console.log('[TRANSFORMER] Warnings:', warnings.slice(0, 5));
			}
			if (errors.length > 0) {
				console.log('[TRANSFORMER] ❌ Errors:', errors);
			}

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
			const errorMessage = `Failed to transform architecture data: ${error instanceof Error ? error.message : "Unknown error"
				}`;
			errors.push(errorMessage);
			logger.error("Architecture transformation failed", {
				error: errorMessage,
				category: LogCategory.ARCHITECTURE,
			});

			return {
				transformed: this.createEmptyArchitecture(),
				warnings,
				errors,
				mappings,
			};
		}
	}

	/**
	 * Transform metadata from frontend to backend format
	 */
	private static transformMetadata(
		frontendMetadata: FrontendArchitectureMetadata,
	): ArchitectureMetadata {
		const transformed: ArchitectureMetadata = {
			name: frontendMetadata.name || "Untitled Architecture",
			description: frontendMetadata.description || "",
			version: frontendMetadata.version || "1.0.0",
			createdAt: frontendMetadata.createdAt || new Date().toISOString(),
			lastModified: frontendMetadata.lastModified || new Date().toISOString(),
			provider: frontendMetadata.provider || "aws",
		};

		// Extract additional properties that might be useful
		transformed.environment = frontendMetadata.environment || undefined;
		transformed.project = frontendMetadata.project || undefined;
		transformed.tags = frontendMetadata.tags || undefined;

		return transformed;
	}

	/**
	 * Transform nodes from frontend to backend format
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

		// Create a mapping of container resources for reference
		const containerMapping: Map<string, FrontendResource> = new Map(
			containerResources.map((resource) => [resource.id, resource])
		);

		for (const frontendResource of serviceResources) {
			try {
				const transformations: string[] = [];

				// Transform resource type from frontend format to backend format
				// aws-vpc → vpc, aws-ec2 → ec2, etc.
				// TODO: Check the usage of these mappings throughout the backend
				const { resourceType, nodeType } = this.mapResourceType(
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

				// Find parent container for context
				let parentId = frontendResource.parent_id;
				let actualParent = undefined;

				// Set parentId only for resources that truly need parent-child relationships
				// For most AWS resources, explicit configuration (vpc_id, subnet_id) is preferred over parent-child
				if (parentId && containerMapping.has(parentId)) {
					const parentContainer = containerMapping.get(parentId)!;

					// Only set parent relationships for resources that benefit from containment
					// Most AWS resources will use explicit vpc_id, subnet_id references instead
					if (
						parentContainer.resource_type.includes("subnet") &&
						frontendResource.resource_type === "aws-ec2"
					) {
						// EC2 instances can have subnet as parent for visual hierarchy
						actualParent = parentId;
						transformations.push(`Kept subnet parent for EC2 instance`);
					}
					// For other resources, avoid parent-child to prevent circular dependencies
					// They will use explicit configuration fields instead (vpc_id, etc.)
				}

				const transformedResource: ArchitectureResource = {
					id: frontendResource.id,
					resource_type: resourceType,
					name: frontendResource.name || frontendResource.id,
					configuration: transformedConfig,
					parent_id: actualParent,
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
				const errorMessage = `Failed to transform resource ${frontendResource.id
					}: ${error instanceof Error ? error.message : "Unknown error"}`;
				errors.push(errorMessage);
				logger.error("Resource transformation failed", {
					error: errorMessage,
					nodeId: frontendResource.id,
					category: LogCategory.ARCHITECTURE,
				});
			}
		}

		// Add logical container resources as service resources if they represent actual AWS resources
		for (const containerResource of containerResources) {
			if (this.shouldConvertContainerToService(containerResource)) {
				try {
					const transformations: string[] = [
						`Converted from container to service`,
					];

					const { resourceType, nodeType } = this.mapResourceType(
						containerResource.resource_type,
						transformations
					);

					const transformedConfig = this.transformNodeConfiguration(
						containerResource,
						containerMapping,
						transformations,
						resourceWarnings
					);

					const transformedResource: ArchitectureResource = {
						id: containerResource.id,
						resource_type: resourceType,
						name: containerResource.name || containerResource.id,
						configuration: transformedConfig,
						parent_id: containerResource.parent_id,
					};

					transformedResources.push(transformedResource);

					resourceMappings.push({
						frontendId: containerResource.id,
						backendId: containerResource.id,
						resourceType: resourceType,
						transformations,
					});
				} catch (error) {
					const errorMessage = `Failed to convert container resource ${containerResource.id
						}: ${error instanceof Error ? error.message : "Unknown error"}`;
					errors.push(errorMessage);
				}
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
	 */
	private static mapResourceType(
		frontendResourceType: string,
		transformations: string[]
	): {
		resourceType: string;
		nodeType: "aws_service" | "aws_container";
	} {
		const resourceTypeMap: Record<
			string,
			{ resourceType: string; nodeType: "aws_service" | "aws_container" }
		> = {
			// Container resources
			"region": { resourceType: "region", nodeType: "aws_container" },
			"aws-region": { resourceType: "region", nodeType: "aws_container" },
			"availability-zone": {
				resourceType: "availability-zone",
				nodeType: "aws_container",
			},
			"aws-availability-zone": {
				resourceType: "availability-zone",
				nodeType: "aws_container",
			},
			// Service resources (most are pass-through now)
			"vpc": { resourceType: "vpc", nodeType: "aws_service" },
			"aws-vpc": { resourceType: "vpc", nodeType: "aws_service" },
			"subnet": { resourceType: "subnet", nodeType: "aws_service" },
			"aws-subnet": { resourceType: "subnet", nodeType: "aws_service" },
			"aws-public-subnet": { resourceType: "subnet", nodeType: "aws_service" },
			"aws-private-subnet": { resourceType: "subnet", nodeType: "aws_service" },
			"ec2": { resourceType: "ec2", nodeType: "aws_service" },
			"aws-ec2": { resourceType: "ec2", nodeType: "aws_service" },
			"security-group": {
				resourceType: "security-group",
				nodeType: "aws_service",
			},
			"aws-security-group": {
				resourceType: "security-group",
				nodeType: "aws_service",
			},
			"internet-gateway": {
				resourceType: "internet-gateway",
				nodeType: "aws_service",
			},
			"aws-internet-gateway": {
				resourceType: "internet-gateway",
				nodeType: "aws_service",
			},
			"nat-gateway": {
				resourceType: "nat-gateway",
				nodeType: "aws_service",
			},
			"aws-nat-gateway": {
				resourceType: "nat-gateway",
				nodeType: "aws_service",
			},
			"route-table": { resourceType: "route-table", nodeType: "aws_service" },
			"aws-route-table": { resourceType: "route-table", nodeType: "aws_service" },
			"s3": { resourceType: "s3", nodeType: "aws_service" },
			"aws-s3": { resourceType: "s3", nodeType: "aws_service" },
			"rds": { resourceType: "rds", nodeType: "aws_service" },
			"aws-rds": { resourceType: "rds", nodeType: "aws_service" },
		};

		const mapping = resourceTypeMap[frontendResourceType.toLowerCase()];

		if (mapping) {
			return {
				resourceType: mapping.resourceType,
				nodeType: mapping.nodeType,
			};
		}

		// Default fallback
		transformations.push(
			`Unknown resource type ${frontendResourceType}, using as-is`
		);
		return {
			resourceType: frontendResourceType,
			nodeType: "aws_service",
		};
	}

	/**
	 * Transform node configuration from frontend to backend format
	 */
	private static transformNodeConfiguration(
		frontendResource: FrontendResource,
		containerMapping: Map<string, FrontendResource>,
		transformations: string[],
		warnings: string[]
	): Record<string, any> {
		const config = { ...frontendResource.configuration } as Record<string, any>;

		// Transform specific configuration based on resource type
		switch (frontendResource.resource_type) {
			case "vpc":
				this.transformVpcConfiguration(
					config as unknown as FrontendVPCConfiguration,
					transformations
				);
				break;
			case "subnet":
				this.transformSubnetConfiguration(
					config as unknown as FrontendSubnetConfiguration,
					frontendResource,
					containerMapping,
					transformations
				);
				break;
			case "ec2":
				this.transformEc2Configuration(
					config as unknown as FrontendEC2Configuration,
					frontendResource,
					containerMapping,
					transformations
				);
				break;
			case "security-group":
				this.transformSecurityGroupConfiguration(
					config as unknown as FrontendSecurityGroupConfiguration,
					transformations
				);
				break;
			case "internet-gateway":
				this.transformInternetGatewayConfiguration(
					config as unknown as FrontendInternetGatewayConfiguration,
					frontendResource,
					containerMapping,
					transformations
				);
				break;
			case "nat-gateway":
				this.transformNatGatewayConfiguration(
					config as unknown as FrontendNATGatewayConfiguration,
					frontendResource,
					containerMapping,
					transformations
				);
				break;
			case "route-table":
				this.transformRouteTableConfiguration(
					config as unknown as FrontendRouteTableConfiguration,
					frontendResource,
					containerMapping,
					transformations
				);
				break;
			case "s3":
				this.transformS3Configuration(config, transformations);
				break;
		}

		// Clean up any remaining legacy fields (in case they exist)
		// Most cleanup is no longer needed since frontend sends correct format

		// Ensure tags exist
		if (!config.tags) {
			config.tags = {};
		}

		// Add resource identification tags
		config.tags.Name = frontendResource.name;
		config.tags.ResourceId = frontendResource.id;

		return config;
	}

	/**
	 * Transform VPC configuration
	 */
	private static transformVpcConfiguration(
		config: FrontendVPCConfiguration & Record<string, any>,
		transformations: string[]
	): void {
		// Frontend now sends snake_case format - minimal transformation needed
		// Just ensure defaults and validate structure
		if (config.enable_dns_support === undefined) {
			config.enable_dns_support = true;
		}
		if (config.enable_dns_hostnames === undefined) {
			config.enable_dns_hostnames = false;
		}
	}

	/**
	 * Transform subnet configuration
	 */
	private static transformSubnetConfiguration(
		config: FrontendSubnetConfiguration & Record<string, any>,
		frontendResource: FrontendResource,
		containerMapping: Map<string, FrontendResource>,
		transformations: string[]
	): void {
		// Frontend now sends snake_case - minimal transformation needed

		// Ensure subnet_type is set
		if (!config.subnet_type) {
			if (frontendResource.resource_type.includes("public")) {
				config.subnet_type = "public";
			} else if (frontendResource.resource_type.includes("private")) {
				config.subnet_type = "private";
			} else {
				config.subnet_type = "private"; // Default to private for security
			}
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
	 * Transform EC2 configuration
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
				transformations.push(`Added subnet reference from parent: ${parent.id}`);
			}
		}
	}

	/**
	 * Transform security group configuration
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
	 * Transform S3 configuration
	 */
	private static transformS3Configuration(
		config: Record<string, any>,
		transformations: string[]
	): void {
		// Frontend now sends snake_case - minimal transformation needed
		// Configuration is already in correct format
	}

	/**
	 * Transform Internet Gateway configuration
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
	 * Transform NAT Gateway configuration
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
			transformations.push("Set default create_eip: true for public NAT Gateway");
		}
	}

	/**
	 * Transform Route Table configuration
	 */
	private static transformRouteTableConfiguration(
		config: FrontendRouteTableConfiguration & Record<string, any>,
		frontendResource: FrontendResource,
		containerMapping: Map<string, FrontendResource>,
		transformations: string[]
	): void {
		// Frontend now sends snake_case - minimal transformation needed

		// Ensure routes is a map (not array)
		if (!config.routes || typeof config.routes !== "object" || Array.isArray(config.routes)) {
			config.routes = {};
			transformations.push("Initialized routes as empty map");
		}

		// Ensure associations is a map (not array)
		if (config.associations && Array.isArray(config.associations)) {
			// Convert array to map
			const associationsMap: Record<string, any> = {};
			config.associations.forEach((assoc: any, index: number) => {
				const key = assoc.subnet_id ? `subnet_${assoc.subnet_id}` : `association_${index}`;
				associationsMap[key] = assoc;
			});
			config.associations = associationsMap;
			transformations.push("Converted associations array to map format");
		} else if (!config.associations) {
			config.associations = {};
			transformations.push("Initialized associations as empty map");
		}
	}

	/**
	 * Find VPC for a given resource by traversing parent containers
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
	 * Check if a resource is contained within another container
	 */
	private static isNodeInContainer(
		resource: FrontendResource,
		container: FrontendResource
	): boolean {
		// Simple position-based containment check
		if (resource.position && container.position && container.dimensions) {
			const resourceX = resource.position.x;
			const resourceY = resource.position.y;
			const containerX = container.position.x;
			const containerY = container.position.y;
			const containerWidth = container.dimensions.width;
			const containerHeight = container.dimensions.height;

			return (
				resourceX >= containerX &&
				resourceX <= containerX + containerWidth &&
				resourceY >= containerY &&
				resourceY <= containerY + containerHeight
			);
		}

		return false;
	}

	/**
	 * Determine if a container resource should be converted to a service resource
	 */
	private static shouldConvertContainerToService(
		containerResource: FrontendResource
	): boolean {
		// Convert container resources that represent actual AWS resources
		// Support both 'vpc' and 'aws-vpc' formats
		const convertibleTypes = [
			"vpc",
			"aws-vpc",
			"subnet",
			"aws-subnet",
			"aws-private-subnet",
			"aws-public-subnet",
			"security-group",
			"aws-security-group",
		];

		return convertibleTypes.includes(containerResource.resource_type);
	}

	/**
	 * Transform connections from frontend to backend format
	 */
	private static transformConnections(
		frontendConnections: any[],
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
					source: frontendConnection.source || frontendConnection.sourceId,
					target: frontendConnection.target || frontendConnection.targetId,
					sourceHandle: frontendConnection.sourceHandle,
					targetHandle: frontendConnection.targetHandle,
					type:
						frontendConnection.type ||
						frontendConnection.connectionType ||
						"dependency",
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
				const errorMessage = `Failed to transform connection: ${error instanceof Error ? error.message : "Unknown error"
					}`;
				connectionWarnings.push(errorMessage);
			}
		}

		// Add implicit connections based on parent-child relationships
		for (const resource of transformedResources) {
			if (resource.parent_id) {
				const parentExists = resourceIds.has(resource.parent_id);
				if (parentExists) {
					const implicitConnection: NodeConnection = {
						id: `implicit-${resource.id}-${resource.parent_id}`,
						source: resource.parent_id,
						target: resource.id,
						type: "contains",
					};
					transformedConnections.push(implicitConnection);
				}
			}
		}

		return {
			transformedConnections,
			connectionWarnings,
		};
	}

	/**
	 * Create an empty architecture structure
	 */
	private static createEmptyArchitecture(): ArchitectureData {
		return {
			metadata: {
				name: "Empty Architecture",
				description: "Failed to transform architecture",
				version: "1.0.0",
				createdAt: new Date().toISOString(),
				lastModified: new Date().toISOString(),
				provider: "aws",
			},
			resources: [],
			connections: [],
			variables: {},
			outputs: {},
		};
	}

	/**
	 * Validate frontend architecture data structure
	 */
	// TODO: Enhance validation rules as by declaring the type for data for the frontend format
	static validateFrontendData(data: any): { valid: boolean; errors: string[]; warnings: string[] } {
		const errors: string[] = [];
		const warnings: string[] = [];

		console.log('[VALIDATOR] Starting validation');
		console.log('[VALIDATOR] Data type:', typeof data);
		console.log('[VALIDATOR] Has metadata:', !!data?.metadata);
		console.log('[VALIDATOR] Has resources:', !!data?.resources);
		console.log('[VALIDATOR] Resources is array:', Array.isArray(data?.resources));
		console.log('[VALIDATOR] Resources count:', data?.resources?.length || 0);

		if (!data) {
			errors.push("Architecture data is required");
			console.log('[VALIDATOR] ❌ No data provided');
			return { valid: false, errors, warnings };
		}

		if (!data.metadata) {
			errors.push("Metadata is required");
		} else {
			if (!data.metadata.name) {
				errors.push("Metadata name is required");
			}
			if (!data.metadata.provider) {
				errors.push("Metadata provider is required");
			}
		}

		// Check resources
		if (!data.resources || !Array.isArray(data.resources)) {
			errors.push("Resources array is required");
			console.log('[VALIDATOR] ❌ Resources is not an array');
		} else if (data.resources.length === 0) {
			errors.push("At least one resource is required");
			console.log('[VALIDATOR] ❌ No resources found');
		}

		// Validate individual resources - check both old and new field names
		for (const [index, resource] of (data.resources || []).entries()) {
			if (!resource.id) {
				errors.push(`Resource at index ${index} is missing id`);
			}
			// Check for both old (resourceType) and new (resource_type) field names
			if (!resource.resourceType && !resource.resource_type) {
				errors.push(`Resource ${resource.id || index} is missing resourceType/resource_type`);
				console.log('[VALIDATOR] Resource fields:', Object.keys(resource));
			}
			// Check for both old (nodeType) and new (node_type) field names
			if (!resource.nodeType && !resource.node_type) {
				errors.push(`Resource ${resource.id || index} is missing nodeType/node_type`);
			}

			// Warn if using old field names
			if (resource.nodeType || resource.resourceType || resource.parentId) {
				warnings.push(`Resource ${resource.id || index} using old camelCase field names (nodeType/resourceType/parentId)`);
			}
		}

		console.log('[VALIDATOR] Validation complete:', {
			valid: errors.length === 0,
			errorsCount: errors.length,
			warningsCount: warnings.length
		});

		if (errors.length > 0) {
			console.log('[VALIDATOR] ❌ Errors:', errors);
		}

		return { valid: errors.length === 0, errors, warnings };
	}

	/**
	 * Generate transformation summary
	 */
	static generateTransformationSummary(result: TransformationResult): any {
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
