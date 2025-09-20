import { ArchitectureData, ArchitectureNode } from "../models/Architecture.js";
import { logger, LogCategory, LogLevel } from "../utils/Logger.js";

export interface ParsedArchitecture {
	nodes: ParsedNode[];
	connections: ParsedConnection[];
	metadata: ArchitectureMetadata;
	validation: ValidationResult;
}

export interface ParsedNode {
	id: string;
	name: string;
	resourceType: string;
	nodeType: string;
	configuration: Record<string, any>;
	position: { x: number; y: number };
	dimensions: { width: number; height: number };
	parentId?: string;
	children: string[];
	dependencies: string[];
	terraformModule: string;
}

export interface ParsedConnection {
	id: string;
	sourceId: string;
	targetId: string;
	connectionType: string;
	configuration: Record<string, any>;
}

export interface ArchitectureMetadata {
	provider: string;
	region: string;
	environment: string;
	project: string;
	version: string;
	tags: Record<string, string>;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationWarning[];
}

export interface ValidationError {
	type:
		| "missing_required"
		| "invalid_type"
		| "invalid_dependency"
		| "duplicate_resource"
		| "configuration_error";
	nodeId?: string;
	field?: string;
	message: string;
}

export interface ValidationWarning {
	type: "best_practice" | "security" | "performance" | "cost";
	nodeId?: string;
	message: string;
}

export class ArchitectureParserService {
	/**
	 * Parse and validate architecture data from JSON
	 */
	static parseArchitecture(
		architectureData: ArchitectureData
	): ParsedArchitecture {
		logger.architecture(LogLevel.INFO, "🔄 Parsing architecture data", {
			component: "ArchitectureParserService",
			operation: "parseArchitecture",
			nodesCount: architectureData.nodes?.length || 0,
			connectionsCount: architectureData.connections?.length || 0,
		});

		const parsedNodes = this.parseNodes(architectureData.nodes);
		const parsedConnections = this.parseConnections(
			architectureData.connections || []
		);
		const metadata = this.parseMetadata(architectureData.metadata);

		// Build dependency graph
		this.buildDependencyGraph(parsedNodes, parsedConnections);

		// Validate the architecture
		const validation = this.validateArchitecture(
			parsedNodes,
			parsedConnections,
			metadata
		);

		logger.architecture(LogLevel.INFO, "✅ Architecture parsing completed", {
			component: "ArchitectureParserService",
			operation: "parseArchitecture",
			parsedNodesCount: parsedNodes.length,
			parsedConnectionsCount: parsedConnections.length,
			validationPassed: validation.valid,
		});

		return {
			nodes: parsedNodes,
			connections: parsedConnections,
			metadata,
			validation,
		};
	}

	/**
	 * Parse individual nodes
	 */
	private static parseNodes(nodes: ArchitectureNode[]): ParsedNode[] {
		return nodes.map((node) => {
			const terraformModule = this.mapResourceTypeToModule(node.resourceType);

			return {
				id: node.id,
				name: node.name || node.id,
				resourceType: node.resourceType,
				nodeType: node.nodeType,
				configuration: this.normalizeConfiguration(node.configuration || {}),
				position: node.position || { x: 0, y: 0 },
				dimensions: node.dimensions || { width: 100, height: 50 },
				parentId: node.parentId,
				children: nodes.filter((n) => n.parentId === node.id).map((n) => n.id),
				dependencies: [], // Will be populated by buildDependencyGraph
				terraformModule,
			};
		});
	}

	/**
	 * Parse connections between nodes
	 */
	private static parseConnections(connections: any[]): ParsedConnection[] {
		return connections.map((conn, index) => ({
			id: conn.id || `connection-${index}`,
			sourceId: conn.sourceId || conn.source,
			targetId: conn.targetId || conn.target,
			connectionType: conn.connectionType || conn.type || "dependency",
			configuration: conn.configuration || {},
		}));
	}

	/**
	 * Parse metadata
	 */
	private static parseMetadata(metadata: any): ArchitectureMetadata {
		return {
			provider: metadata?.provider || "aws",
			region: metadata?.region || "us-east-1",
			environment: metadata?.environment || "development",
			project: metadata?.project || "infrastructure",
			version: metadata?.version || "1.0.0",
			tags: {
				Environment: metadata?.environment || "development",
				Project: metadata?.project || "infrastructure",
				ManagedBy: "Darch",
				CreatedAt: new Date().toISOString(),
				...metadata?.tags,
			},
		};
	}

	/**
	 * Map resource type to Terraform module
	 */
	private static mapResourceTypeToModule(resourceType: string): string {
		const moduleMap: Record<string, string> = {
			// Networking
			vpc: "networking/vpc",
			"aws-vpc": "networking/vpc",
			subnet: "networking/subnet",
			"aws-subnet": "networking/subnet",
			"aws-private-subnet": "networking/subnet",
			"aws-public-subnet": "networking/subnet",
			"internet-gateway": "networking/internet-gateway",
			"aws-internet-gateway": "networking/internet-gateway",
			igw: "networking/internet-gateway",
			"route-table": "networking/route-table",
			"aws-route-table": "networking/route-table",
			rt: "networking/route-table",

			// Compute
			ec2: "compute/ec2",
			"aws-ec2": "compute/ec2",
			instance: "compute/ec2",
			"aws-instance": "compute/ec2",

			// Security
			"security-group": "security/security-group",
			"aws-security-group": "security/security-group",
			sg: "security/security-group",

			// Storage
			s3: "storage/s3",
			"aws-s3": "storage/s3",
			bucket: "storage/s3",
			"s3-bucket": "storage/s3",

			// Database
			rds: "database/rds",
			"aws-rds": "database/rds",
			database: "database/rds",
		};

		const module = moduleMap[resourceType.toLowerCase()];
		if (!module) {
			logger.warn(
				`⚠️ No module mapping found for resource type: ${resourceType}`,
				{
					resourceType,
					availableTypes: Object.keys(moduleMap),
					fallbackModule: "compute/ec2",
					category: LogCategory.MODULE,
					component: "ArchitectureParserService",
					operation: "getModuleForResourceType",
				}
			);
			return "compute/ec2"; // Default fallback
		}

		return module;
	}

	/**
	 * Normalize configuration to ensure consistent structure
	 */
	private static normalizeConfiguration(
		config: Record<string, any>
	): Record<string, any> {
		const normalized = { ...config };

		// Ensure tags exist
		if (!normalized.tags) {
			normalized.tags = {};
		}

		// Convert string booleans to actual booleans
		for (const [key, value] of Object.entries(normalized)) {
			if (value === "true") normalized[key] = true;
			if (value === "false") normalized[key] = false;
		}

		return normalized;
	}

	/**
	 * Build dependency graph from connections and parent-child relationships
	 */
	private static buildDependencyGraph(
		nodes: ParsedNode[],
		connections: ParsedConnection[]
	): void {
		const nodeIds = new Set(nodes.map(n => n.id));

		// Add parent dependencies (child depends on parent) only if parent exists as a service
		for (const node of nodes) {
			if (node.parentId && nodeIds.has(node.parentId)) {
				node.dependencies.push(node.parentId);
			}
		}

		// Add connection-based dependencies
		for (const connection of connections) {
			const targetNode = nodes.find((n) => n.id === connection.targetId);
			if (
				targetNode &&
				!targetNode.dependencies.includes(connection.sourceId)
			) {
				targetNode.dependencies.push(connection.sourceId);
			}
		}

		// Add implicit dependencies based on resource types
		this.addImplicitDependencies(nodes);
	}

	/**
	 * Add implicit dependencies based on AWS resource relationships
	 * Only add dependencies when explicit configuration doesn't already provide the reference
	 */
	private static addImplicitDependencies(nodes: ParsedNode[]): void {
		const nodeMap = new Map(nodes.map((n) => [n.id, n]));

		for (const node of nodes) {
			switch (node.terraformModule) {
				case "networking/subnet":
					// Only add VPC dependency if subnet doesn't have explicit vpc_id
					if (!node.configuration.vpc_id) {
						const vpc = nodes.find((n) => n.terraformModule === "networking/vpc");
						if (vpc && !node.dependencies.includes(vpc.id)) {
							node.dependencies.push(vpc.id);
						}
					}
					break;

				case "networking/internet-gateway":
					// Only add VPC dependency if IGW doesn't have explicit vpc_id
					if (!node.configuration.vpc_id) {
						const igwVpc = nodes.find(
							(n) => n.terraformModule === "networking/vpc"
						);
						if (igwVpc && !node.dependencies.includes(igwVpc.id)) {
							node.dependencies.push(igwVpc.id);
						}
					}
					break;

				case "networking/route-table":
					// Only add VPC dependency if route table doesn't have explicit vpc_id
					if (!node.configuration.vpc_id) {
						const rtVpc = nodes.find(
							(n) => n.terraformModule === "networking/vpc"
						);
						if (rtVpc && !node.dependencies.includes(rtVpc.id)) {
							node.dependencies.push(rtVpc.id);
						}
					}

					// If route table has routes to Internet Gateway, add dependency
					if (node.configuration.routes) {
						const routes = node.configuration.routes;
						if (typeof routes === "object") {
							Object.values(routes).forEach((route: any) => {
								if (route.gateway_id) {
									const igw = nodes.find(
										(n) =>
											n.terraformModule === "networking/internet-gateway" &&
											(n.configuration.name === route.gateway_id ||
												n.id === route.gateway_id)
									);
									if (igw && !node.dependencies.includes(igw.id)) {
										node.dependencies.push(igw.id);
									}
								}
							});
						}
					}
					break;

				case "compute/ec2":
					// Only add subnet dependency if EC2 doesn't have explicit subnet_id
					if (!node.configuration.subnet_id) {
						const subnet = nodes.find(
							(n) => n.terraformModule === "networking/subnet"
						);
						if (subnet && !node.dependencies.includes(subnet.id)) {
							node.dependencies.push(subnet.id);
						}
					}

					// Only add security group dependency if EC2 doesn't have explicit security_group_ids
					if (!node.configuration.security_group_ids || node.configuration.security_group_ids.length === 0) {
						const securityGroup = nodes.find(
							(n) => n.terraformModule === "security/security-group"
						);
						if (securityGroup && !node.dependencies.includes(securityGroup.id)) {
							node.dependencies.push(securityGroup.id);
						}
					}
					break;

				case "security/security-group":
					// Only add VPC dependency if security group doesn't have explicit vpc_id
					if (!node.configuration.vpc_id) {
						const sgVpc = nodes.find(
							(n) => n.terraformModule === "networking/vpc"
						);
						if (sgVpc && !node.dependencies.includes(sgVpc.id)) {
							node.dependencies.push(sgVpc.id);
						}
					}
					break;
			}
		}
	}

	/**
	 * Validate the entire architecture
	 */
	private static validateArchitecture(
		nodes: ParsedNode[],
		connections: ParsedConnection[],
		metadata: ArchitectureMetadata
	): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];

		// Validate individual nodes
		for (const node of nodes) {
			const nodeValidation = this.validateNode(node, nodes);
			if (nodeValidation.errors.length > 0) {
				logger.architecture(
					LogLevel.ERROR,
					`❌ Node validation failed for ${node.resourceType} ${node.id}`,
					{
						component: "ArchitectureParserService",
						operation: "validateArchitecture",
						nodeId: node.id,
						resourceType: node.resourceType,
						errors: nodeValidation.errors,
					}
				);
			}
			errors.push(...nodeValidation.errors);
			warnings.push(...nodeValidation.warnings);
		}

		// Validate dependencies
		const dependencyValidation = this.validateDependencies(nodes);
		if (dependencyValidation.errors.length > 0) {
			logger.architecture(LogLevel.ERROR, "❌ Dependency validation failed", {
				component: "ArchitectureParserService",
				operation: "validateArchitecture",
				errors: dependencyValidation.errors,
			});
		}
		errors.push(...dependencyValidation.errors);
		warnings.push(...dependencyValidation.warnings);

		// Validate connections
		const connectionValidation = this.validateConnections(connections, nodes);
		if (connectionValidation.errors.length > 0) {
			logger.architecture(LogLevel.ERROR, "❌ Connection validation failed", {
				component: "ArchitectureParserService",
				operation: "validateArchitecture",
				errors: connectionValidation.errors,
			});
		}
		errors.push(...connectionValidation.errors);
		warnings.push(...connectionValidation.warnings);

		// Validate architecture patterns
		const patternValidation = this.validateArchitecturePatterns(nodes);
		warnings.push(...patternValidation.warnings);

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Validate individual node
	 */
	private static validateNode(
		node: ParsedNode,
		allNodes: ParsedNode[]
	): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];

		// Check required fields based on resource type
		const requiredFields = this.getRequiredFields(node.terraformModule);
		for (const field of requiredFields) {
			logger.architecture(
				LogLevel.DEBUG,
				`🔍 Validating required field '${field}' for ${node.resourceType} ${node.id}`,
				{
					component: "ArchitectureParserService",
					operation: "validateNode",
					nodeId: node.id,
					resourceType: node.resourceType,
					configuration: node.configuration,
					field,
				}
			);
			if (!(field in node.configuration)) {
				errors.push({
					type: "missing_required",
					nodeId: node.id,
					field,
					message: `Required field '${field}' is missing for ${node.resourceType}`,
				});
			}
		}

		// Validate CIDR blocks for networking resources
		if (node.terraformModule.startsWith("networking/")) {
			const cidrValidation = this.validateCidrBlocks(node, allNodes);
			errors.push(...cidrValidation.errors);
			warnings.push(...cidrValidation.warnings);
		}

		// Security validations
		if (node.terraformModule === "security/security-group") {
			const securityValidation = this.validateSecurityGroup(node);
			warnings.push(...securityValidation.warnings);
		}

		return { valid: errors.length === 0, errors, warnings };
	}

	/**
	 * Get required fields for a module
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
	 * Validate CIDR blocks
	 */
	private static validateCidrBlocks(
		node: ParsedNode,
		allNodes: ParsedNode[]
	): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];

		if (node.configuration.cidr_block) {
			const cidr = node.configuration.cidr_block;

			// Basic CIDR format validation
			if (!this.isValidCidr(cidr)) {
				errors.push({
					type: "configuration_error",
					nodeId: node.id,
					field: "cidr_block",
					message: `Invalid CIDR block format: ${cidr}`,
				});
			}

			// Check for CIDR overlaps
			const overlaps = this.findCidrOverlaps(node, allNodes);
			for (const overlap of overlaps) {
				warnings.push({
					type: "best_practice",
					nodeId: node.id,
					message: `CIDR block ${cidr} overlaps with ${overlap.resourceType} ${overlap.id}`,
				});
			}
		}

		return { valid: errors.length === 0, errors, warnings };
	}

	/**
	 * Validate security group configuration
	 */
	private static validateSecurityGroup(node: ParsedNode): ValidationResult {
		const warnings: ValidationWarning[] = [];

		// Check for overly permissive rules
		const ingressRules = node.configuration.ingress_rules || [];
		for (const rule of ingressRules) {
			if (
				rule.cidr_blocks?.includes("0.0.0.0/0") &&
				rule.from_port !== 80 &&
				rule.from_port !== 443
			) {
				warnings.push({
					type: "security",
					nodeId: node.id,
					message: `Security group allows traffic from anywhere (0.0.0.0/0) on port ${rule.from_port}`,
				});
			}
		}

		return { valid: true, errors: [], warnings };
	}

	/**
	 * Validate dependencies for circular references
	 */
	private static validateDependencies(nodes: ParsedNode[]): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];

		// Check for circular dependencies
		const visited = new Set<string>();
		const recursionStack = new Set<string>();

		const hasCycle = (nodeId: string): boolean => {
			if (recursionStack.has(nodeId)) return true;
			if (visited.has(nodeId)) return false;

			visited.add(nodeId);
			recursionStack.add(nodeId);

			const node = nodes.find((n) => n.id === nodeId);
			if (node) {
				for (const depId of node.dependencies) {
					if (hasCycle(depId)) return true;
				}
			}

			recursionStack.delete(nodeId);
			return false;
		};

		for (const node of nodes) {
			if (hasCycle(node.id)) {
				errors.push({
					type: "invalid_dependency",
					nodeId: node.id,
					message: `Circular dependency detected involving ${node.resourceType} ${node.id}`,
				});
			}
		}

		return { valid: errors.length === 0, errors, warnings };
	}

	/**
	 * Validate connections
	 */
	private static validateConnections(
		connections: ParsedConnection[],
		nodes: ParsedNode[]
	): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];

		const nodeIds = new Set(nodes.map((n) => n.id));

		for (const connection of connections) {
			if (!nodeIds.has(connection.sourceId)) {
				errors.push({
					type: "invalid_dependency",
					message: `Connection references non-existent source node: ${connection.sourceId}`,
				});
			}

			if (!nodeIds.has(connection.targetId)) {
				errors.push({
					type: "invalid_dependency",
					message: `Connection references non-existent target node: ${connection.targetId}`,
				});
			}
		}

		return { valid: errors.length === 0, errors, warnings };
	}

	/**
	 * Validate architecture patterns and best practices
	 */
	private static validateArchitecturePatterns(
		nodes: ParsedNode[]
	): ValidationResult {
		const warnings: ValidationWarning[] = [];

		// Check for missing VPC
		const hasVpc = nodes.some((n) => n.terraformModule === "networking/vpc");
		if (
			!hasVpc &&
			nodes.some((n) => n.terraformModule.startsWith("networking/"))
		) {
			warnings.push({
				type: "best_practice",
				message: "Consider using a VPC for better network isolation",
			});
		}

		// Check for instances without security groups
		const ec2Nodes = nodes.filter((n) => n.terraformModule === "compute/ec2");
		const hasSecurityGroups = nodes.some(
			(n) => n.terraformModule === "security/security-group"
		);

		if (ec2Nodes.length > 0 && !hasSecurityGroups) {
			warnings.push({
				type: "security",
				message: "EC2 instances should be associated with security groups",
			});
		}

		return { valid: true, errors: [], warnings };
	}

	/**
	 * Validate CIDR format
	 */
	private static isValidCidr(cidr: string): boolean {
		const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
		return cidrRegex.test(cidr);
	}

	/**
	 * Find CIDR overlaps
	 */
	private static findCidrOverlaps(
		node: ParsedNode,
		allNodes: ParsedNode[]
	): ParsedNode[] {
		// Simplified overlap detection - in production, use proper CIDR calculation
		const overlaps: ParsedNode[] = [];
		const nodeCidr = node.configuration.cidr_block;

		for (const otherNode of allNodes) {
			if (
				otherNode.id !== node.id &&
				otherNode.configuration.cidr_block === nodeCidr
			) {
				overlaps.push(otherNode);
			}
		}

		return overlaps;
	}
}
