import { ArchitectureData, ArchitectureNode, NodeConnection } from '../models/Architecture.js';
import { logger, LogCategory, LogLevel } from '../utils/Logger.js';

// Frontend type definitions matching the actual frontend structure
export interface FrontendPosition {
  x: number;
  y: number;
}

export interface FrontendDimensions {
  width: number;
  height: number;
}

export interface FrontendNodeConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}

export interface FrontendArchitectureMetadata {
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  lastModified: string;
  provider: string; // e.g., 'aws', 'azure', 'gcp'
  [key: string]: any;
}

export interface FrontendNode {
  id: string;
  nodeType: 'awsService' | 'awsContainer';
  resourceType: string; // e.g., 'aws-ec2', 'aws-vpc', 'aws-s3'
  name: string;
  icon: string;
  position: FrontendPosition;
  dimensions?: FrontendDimensions;
  configuration: FrontendAWSResourceConfiguration;
  parentId?: string; // For nodes inside containers
}

export interface FrontendArchitectureData {
  metadata: FrontendArchitectureMetadata;
  nodes: FrontendNode[];
  connections: FrontendNodeConnection[];
  variables?: {
    [key: string]: {
      description: string;
      type: string;
      default?: string | number | boolean;
    };
  };
  outputs?: {
    [key: string]: {
      description: string;
      value: string;
    };
  };
}

// Frontend AWS Resource Configuration types
export interface FrontendVPCConfiguration {
  awsVpcId: string;
  cidrBlock?: string;
  awsRegionId?: string;
  description?: string;
  enableDnsSupport?: boolean;
  enableDnsHostnames?: boolean;
  tags?: string | Record<string, string>;
}

export interface FrontendEC2Configuration {
  awsEc2Id: string;
  instanceType?: string;
  amiId?: string;
  keyPairName?: string;
  awsRegionId?: string;
  awsAvailabilityZone?: string;
  subnetId?: string;
  securityGroups?: string[];
  rootVolumeSize?: number;
  rootVolumeType?: string;
  deleteOnTermination?: boolean;
  encrypted?: boolean;
  detailedMonitoring?: boolean;
  terminationProtection?: boolean;
  autoRecovery?: boolean;
  associatePublicIpAddress?: boolean;
  tenancy?: string;
  tags?: Record<string, string>;
}

export interface FrontendPublicSubnetConfiguration {
  awsPublicSubnetId: string;
  cidrBlock: string;
  awsVpcId: string;
  awsRegionId: string;
  awsAvailabilityZone: string;
  description: string;
  mapPublicIpOnLaunch: boolean;
  tags?: string | Record<string, string>;
}

export interface FrontendPrivateSubnetConfiguration {
  awsPrivateSubnetId: string;
  cidrBlock: string;
  awsVpcId: string;
  awsRegionId: string;
  awsAvailabilityZone: string;
  description: string;
  mapPublicIpOnLaunch: boolean;
  enableNatGateway: boolean;
  tags?: string | Record<string, string>;
}

export interface FrontendAWSRegionConfiguration {
  awsRegionId: string;
  region: string;
  regionName: string;
  description: string;
  isEnabled: boolean;
  isDefault: boolean;
  tags: string | Record<string, string>;
}

export interface FrontendAvailabilityZoneConfiguration {
  awsAvailabilityZoneId: string;
  awsRegionId: string;
  availabilityZone: string;
  description: string;
  isEnabled: boolean;
  isPreferred: boolean;
  tags: string | Record<string, string>;
}

export interface FrontendSecurityGroupConfiguration {
  awsSecurityGroupId: string;
  groupId?: string;
  awsVpcId: string;
  description?: string;
  ingressRules?: FrontendSecurityGroupRule[];
  egressRules?: FrontendSecurityGroupRule[];
  tags?: Record<string, string>;
}

export interface FrontendSecurityGroupRule {
  protocol: "tcp" | "udp" | "icmp" | "all";
  port: number | string;
  source?: string;
  destination?: string;
  description?: string;
}

export type FrontendAWSResourceConfiguration =
  | FrontendVPCConfiguration
  | FrontendEC2Configuration
  | FrontendPublicSubnetConfiguration
  | FrontendPrivateSubnetConfiguration
  | FrontendAWSRegionConfiguration
  | FrontendAvailabilityZoneConfiguration
  | FrontendSecurityGroupConfiguration
  | Record<string, any>;

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
  static transformToBackendFormat(frontendData: FrontendArchitectureData): TransformationResult {
    const startTime = Date.now();

    logger.architecture(LogLevel.INFO, '🔄 Transforming frontend architecture data to backend format', {
      nodesCount: frontendData.nodes?.length || 0,
      connectionsCount: frontendData.connections?.length || 0,
      provider: frontendData.metadata?.provider,
      component: 'FrontendArchitectureTransformerService'
    });

    const warnings: string[] = [];
    const errors: string[] = [];
    const mappings: ResourceMapping[] = [];

    try {
            // Transform components
      const transformedMetadata = this.transformMetadata(frontendData.metadata, frontendData.nodes);

      // Transform nodes
      const { transformedNodes, nodeWarnings, nodeMappings } = this.transformNodes(
        frontendData.nodes,
        warnings,
        errors
      );
      warnings.push(...nodeWarnings);
      mappings.push(...nodeMappings);

      // Transform connections
      const { transformedConnections, connectionWarnings } = this.transformConnections(
        frontendData.connections || [],
        transformedNodes,
        warnings
      );
      warnings.push(...connectionWarnings);

      const transformed: ArchitectureData = {
        metadata: transformedMetadata,
        nodes: transformedNodes,
        connections: transformedConnections,
        variables: frontendData.variables || {},
        outputs: frontendData.outputs || {}
      };

      const duration = Date.now() - startTime;

      logger.architecture(LogLevel.INFO, '✅ Frontend transformation completed successfully', {
        nodesCount: transformedNodes.length,
        connectionsCount: transformedConnections.length,
        warningsCount: warnings.length,
        errorsCount: errors.length,
        mappingsCount: mappings.length,
        duration,
        component: 'FrontendArchitectureTransformerService'
      });

      return {
        transformed,
        warnings,
        errors,
        mappings
      };

    } catch (error) {
      const errorMessage = `Failed to transform architecture data: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMessage);
      logger.error('❌ Architecture transformation failed', {
        error: errorMessage,
        category: LogCategory.ARCHITECTURE,
        component: 'FrontendArchitectureTransformerService',
        operation: 'transform'
      });

      return {
        transformed: this.createEmptyArchitecture(),
        warnings,
        errors,
        mappings
      };
    }
  }

  /**
   * Transform metadata from frontend to backend format
   */
  private static transformMetadata(
    frontendMetadata: any,
    frontendNodes: FrontendNode[]
  ): any {
    const transformed: any = {
      name: frontendMetadata.name || 'Untitled Architecture',
      description: frontendMetadata.description || '',
      version: frontendMetadata.version || '1.0.0',
      createdAt: frontendMetadata.createdAt || new Date().toISOString(),
      lastModified: frontendMetadata.lastModified || new Date().toISOString(),
      provider: frontendMetadata.provider || 'aws'
    };

    // Extract region from aws-region container nodes
    const regionNode = frontendNodes.find(node => node.resourceType === 'aws-region');
    if (regionNode?.configuration && 'region' in regionNode.configuration) {
      transformed.region = (regionNode.configuration as any).region;
    } else if (frontendMetadata.region) {
      transformed.region = frontendMetadata.region;
    }

    // Extract additional properties that might be useful
    if (frontendMetadata.environment) {
      transformed.environment = frontendMetadata.environment;
    }
    if (frontendMetadata.project) {
      transformed.project = frontendMetadata.project;
    }
    if (frontendMetadata.tags) {
      transformed.tags = frontendMetadata.tags;
    }

    return transformed;
  }

  /**
   * Transform nodes from frontend to backend format
   */
  private static transformNodes(
    frontendNodes: FrontendNode[],
    warnings: string[],
    errors: string[]
  ): {
    transformedNodes: ArchitectureNode[];
    nodeWarnings: string[];
    nodeMappings: ResourceMapping[];
  } {
    const transformedNodes: ArchitectureNode[] = [];
    const nodeWarnings: string[] = [];
    const nodeMappings: ResourceMapping[] = [];

    // Filter out container nodes and keep only service nodes for backend
    const serviceNodes = frontendNodes.filter(node => node.nodeType === 'awsService');
    const containerNodes = frontendNodes.filter(node => node.nodeType === 'awsContainer');

    // Create a mapping of container nodes for reference
    const containerMapping = new Map(containerNodes.map(node => [node.id, node]));

    for (const frontendNode of serviceNodes) {
      try {
        const transformations: string[] = [];

        // Transform resource type from frontend format to backend format
        const { resourceType, nodeType } = this.mapResourceType(frontendNode.resourceType, transformations);

        // Transform configuration
        const transformedConfig = this.transformNodeConfiguration(
          frontendNode,
          containerMapping,
          transformations,
          nodeWarnings
        );

        // Find parent container for context
        let parentId = frontendNode.parentId;
        let actualParent = undefined;

        // If the node has a parent, check if we need to find the VPC or other logical parent
        if (parentId && containerMapping.has(parentId)) {
          const parentContainer = containerMapping.get(parentId)!;

          // If parent is a subnet, find the VPC
          if (parentContainer.resourceType.includes('subnet')) {
            const vpc = containerNodes.find(n =>
              n.resourceType.includes('vpc') &&
              this.isNodeInContainer(parentContainer, n)
            );
            if (vpc) {
              actualParent = vpc.id;
              transformations.push(`Parent changed from ${parentContainer.resourceType} to VPC`);
            }
          }
          // If parent is availability zone, find the VPC
          else if (parentContainer.resourceType.includes('availability-zone')) {
            const vpc = containerNodes.find(n =>
              n.resourceType.includes('vpc') &&
              this.isNodeInContainer(parentContainer, n)
            );
            if (vpc) {
              actualParent = vpc.id;
              transformations.push(`Parent changed from availability zone to VPC`);
            }
          }
          // If parent is already a VPC or other logical container, keep it
          else if (parentContainer.resourceType.includes('vpc') ||
                   parentContainer.resourceType.includes('security')) {
            actualParent = parentId;
          }
        }

        const transformedNode: ArchitectureNode = {
          id: frontendNode.id,
          nodeType: nodeType,
          resourceType: resourceType,
          name: frontendNode.name || frontendNode.id,
          icon: frontendNode.icon,
          position: frontendNode.position,
          dimensions: frontendNode.dimensions,
          configuration: transformedConfig,
          parentId: actualParent
        };

        transformedNodes.push(transformedNode);

        // Record mapping
        nodeMappings.push({
          frontendId: frontendNode.id,
          backendId: frontendNode.id,
          resourceType: resourceType,
          transformations
        });

      } catch (error) {
        const errorMessage = `Failed to transform node ${frontendNode.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        logger.error('❌ Node transformation failed', {
          error: errorMessage,
          nodeId: frontendNode.id,
          category: LogCategory.ARCHITECTURE,
          component: 'FrontendArchitectureTransformerService',
          operation: 'transformNode'
        });
      }
    }

    // Add logical container nodes as service nodes if they represent actual AWS resources
    for (const containerNode of containerNodes) {
      if (this.shouldConvertContainerToService(containerNode)) {
        try {
          const transformations: string[] = [`Converted from container to service`];

          const { resourceType, nodeType } = this.mapResourceType(containerNode.resourceType, transformations);

          const transformedConfig = this.transformNodeConfiguration(
            containerNode,
            containerMapping,
            transformations,
            nodeWarnings
          );

          const transformedNode: ArchitectureNode = {
            id: containerNode.id,
            nodeType: 'awsService',
            resourceType: resourceType,
            name: containerNode.name || containerNode.id,
            icon: containerNode.icon,
            position: containerNode.position,
            dimensions: containerNode.dimensions,
            configuration: transformedConfig,
            parentId: containerNode.parentId
          };

          transformedNodes.push(transformedNode);

          nodeMappings.push({
            frontendId: containerNode.id,
            backendId: containerNode.id,
            resourceType: resourceType,
            transformations
          });

        } catch (error) {
          const errorMessage = `Failed to convert container node ${containerNode.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
        }
      }
    }

    return {
      transformedNodes,
      nodeWarnings,
      nodeMappings
    };
  }

  /**
   * Map frontend resource type to backend resource type
   */
  private static mapResourceType(frontendResourceType: string, transformations: string[]): {
    resourceType: string;
    nodeType: 'awsService' | 'awsContainer';
  } {
    const resourceTypeMap: Record<string, { backend: string; nodeType: 'awsService' | 'awsContainer' }> = {
      // Frontend AWS resource types to backend types
      'aws-vpc': { backend: 'vpc', nodeType: 'awsService' },
      'aws-region': { backend: 'region', nodeType: 'awsContainer' },
      'aws-availability-zone': { backend: 'availability-zone', nodeType: 'awsContainer' },
      'aws-public-subnet': { backend: 'subnet', nodeType: 'awsService' },
      'aws-private-subnet': { backend: 'subnet', nodeType: 'awsService' },
      'aws-subnet': { backend: 'subnet', nodeType: 'awsService' },
      'aws-ec2': { backend: 'ec2', nodeType: 'awsService' },
      'aws-security-group': { backend: 'security-group', nodeType: 'awsService' },
      'aws-s3': { backend: 's3', nodeType: 'awsService' },
      'aws-rds': { backend: 'rds', nodeType: 'awsService' },

      // Generic mappings
      'vpc': { backend: 'vpc', nodeType: 'awsService' },
      'subnet': { backend: 'subnet', nodeType: 'awsService' },
      'ec2': { backend: 'ec2', nodeType: 'awsService' },
      'security-group': { backend: 'security-group', nodeType: 'awsService' },
      's3': { backend: 's3', nodeType: 'awsService' },
      'rds': { backend: 'rds', nodeType: 'awsService' }
    };

    const mapping = resourceTypeMap[frontendResourceType.toLowerCase()];

    if (mapping) {
      if (mapping.backend !== frontendResourceType) {
        transformations.push(`Resource type: ${frontendResourceType} → ${mapping.backend}`);
      }
      return {
        resourceType: mapping.backend,
        nodeType: mapping.nodeType
      };
    }

    // Default fallback
    transformations.push(`Unknown resource type ${frontendResourceType}, using as-is`);
    return {
      resourceType: frontendResourceType,
      nodeType: 'awsService'
    };
  }

  /**
   * Transform node configuration from frontend to backend format
   */
  private static transformNodeConfiguration(
    frontendNode: FrontendNode,
    containerMapping: Map<string, FrontendNode>,
    transformations: string[],
    warnings: string[]
  ): Record<string, any> {
    const config = { ...frontendNode.configuration } as Record<string, any>;

    // First, map frontend fields to backend fields before deletion
    if ('awsAvailabilityZone' in config && !config.availability_zone) {
      config.availability_zone = config.awsAvailabilityZone;
      transformations.push('awsAvailabilityZone → availability_zone');
    }

    // Remove frontend-specific configuration properties safely
    if ('awsRegionId' in config) delete config.awsRegionId;
    if ('awsAvailabilityZone' in config) delete config.awsAvailabilityZone;
    if ('awsVpcId' in config) delete config.awsVpcId;
    if ('awsPublicSubnetId' in config) delete config.awsPublicSubnetId;
    if ('awsPrivateSubnetId' in config) delete config.awsPrivateSubnetId;
    if ('awsEc2Id' in config) delete config.awsEc2Id;
    if ('awsSecurityGroupId' in config) delete config.awsSecurityGroupId;
    if ('awsAvailabilityZoneId' in config) delete config.awsAvailabilityZoneId;

    // Transform specific configuration based on resource type
    switch (frontendNode.resourceType) {
      case 'aws-vpc':
        this.transformVpcConfiguration(config, transformations);
        break;
      case 'aws-public-subnet':
      case 'aws-private-subnet':
        this.transformSubnetConfiguration(config, frontendNode, containerMapping, transformations);
        break;
      case 'aws-ec2':
        this.transformEc2Configuration(config, frontendNode, containerMapping, transformations);
        break;
      case 'aws-security-group':
        this.transformSecurityGroupConfiguration(config, transformations);
        break;
      case 'aws-s3':
        this.transformS3Configuration(config, transformations);
        break;
    }

    // Ensure tags exist
    if (!config.tags) {
      config.tags = {};
    }

    // Add resource identification tags
    config.tags.Name = frontendNode.name;
    config.tags.ResourceId = frontendNode.id;

    return config;
  }

  /**
   * Transform VPC configuration
   */
  private static transformVpcConfiguration(config: Record<string, any>, transformations: string[]): void {
    // Map frontend VPC properties to backend format
    if (config.cidrBlock && !config.cidr_block) {
      config.cidr_block = config.cidrBlock;
      delete config.cidrBlock;
      transformations.push('cidrBlock → cidr_block');
    }

    if (config.enableDnsSupport !== undefined && config.enable_dns_support === undefined) {
      config.enable_dns_support = config.enableDnsSupport;
      delete config.enableDnsSupport;
      transformations.push('enableDnsSupport → enable_dns_support');
    }

    if (config.enableDnsHostnames !== undefined && config.enable_dns_hostnames === undefined) {
      config.enable_dns_hostnames = config.enableDnsHostnames;
      delete config.enableDnsHostnames;
      transformations.push('enableDnsHostnames → enable_dns_hostnames');
    }

    // Handle tags - convert string format to object if needed
    if (config.tags && typeof config.tags === 'string') {
      const tagsObject: Record<string, string> = {};
      config.tags.split(',').forEach((tag: string) => {
        const [key, value] = tag.split('=');
        if (key && value) {
          tagsObject[key.trim()] = value.trim();
        }
      });
      config.tags = tagsObject;
      transformations.push('Converted string tags to object format');
    }
  }

  /**
   * Transform subnet configuration
   */
  private static transformSubnetConfiguration(
    config: Record<string, any>,
    frontendNode: FrontendNode,
    containerMapping: Map<string, FrontendNode>,
    transformations: string[]
  ): void {
    // Map frontend subnet properties to backend format
    if (config.cidrBlock && !config.cidr_block) {
      config.cidr_block = config.cidrBlock;
      delete config.cidrBlock;
      transformations.push('cidrBlock → cidr_block');
    }

    // awsAvailabilityZone is already mapped to availability_zone above

    if (config.mapPublicIpOnLaunch !== undefined && config.map_public_ip_on_launch === undefined) {
      config.map_public_ip_on_launch = config.mapPublicIpOnLaunch;
      delete config.mapPublicIpOnLaunch;
      transformations.push('mapPublicIpOnLaunch → map_public_ip_on_launch');
    }

    // Determine subnet type from resource type or name
    if (!config.subnet_type) {
      if (frontendNode.resourceType.includes('public')) {
        config.subnet_type = 'public';
      } else if (frontendNode.resourceType.includes('private')) {
        config.subnet_type = 'private';
      } else {
        config.subnet_type = 'private'; // Default to private for security
      }
      transformations.push(`Added subnet_type: ${config.subnet_type}`);
    }

    // Find VPC reference from parent containers or configuration
    if (!config.vpc_id) {
      // First try to find from awsVpcId in config
      if (config.awsVpcId) {
        config.vpc_id = config.awsVpcId;
        transformations.push(`Added VPC reference from awsVpcId: ${config.awsVpcId}`);
      } else if (frontendNode.parentId) {
        // Then try to find VPC from parent chain
        const vpc = this.findVpcForNode(frontendNode, containerMapping);
        if (vpc) {
          config.vpc_id = vpc.id;
          transformations.push(`Added VPC reference from parent: ${vpc.id}`);
        }
      }
    }

    // Handle tags - convert string format to object if needed
    if (config.tags && typeof config.tags === 'string') {
      const tagsObject: Record<string, string> = {};
      config.tags.split(',').forEach((tag: string) => {
        const [key, value] = tag.split('=');
        if (key && value) {
          tagsObject[key.trim()] = value.trim();
        }
      });
      config.tags = tagsObject;
      transformations.push('Converted string tags to object format');
    }
  }

  /**
   * Transform EC2 configuration
   */
  private static transformEc2Configuration(
    config: Record<string, any>,
    frontendNode: FrontendNode,
    containerMapping: Map<string, FrontendNode>,
    transformations: string[]
  ): void {
    // Map frontend EC2 properties to backend format
    if (config.instanceType && !config.instance_type) {
      config.instance_type = config.instanceType;
      delete config.instanceType;
      transformations.push('instanceType → instance_type');
    }

    if (config.amiId && !config.ami_id) {
      config.ami_id = config.amiId;
      delete config.amiId;
      transformations.push('amiId → ami_id');
    }

    if (config.associatePublicIpAddress !== undefined && config.associate_public_ip_address === undefined) {
      config.associate_public_ip_address = config.associatePublicIpAddress;
      delete config.associatePublicIpAddress;
      transformations.push('associatePublicIpAddress → associate_public_ip_address');
    }

    // Transform root block device
    if (config.rootVolumeSize || config.rootVolumeType || config.deleteOnTermination !== undefined || config.encrypted !== undefined) {
      config.root_block_device = {
        volume_size: config.rootVolumeSize || 8,
        volume_type: config.rootVolumeType || 'gp3',
        delete_on_termination: config.deleteOnTermination !== false,
        encrypted: config.encrypted === true
      };

      delete config.rootVolumeSize;
      delete config.rootVolumeType;
      delete config.deleteOnTermination;
      delete config.encrypted;

      transformations.push('Converted root volume configuration to root_block_device');
    }

    // Set default root block device if not present
    if (!config.root_block_device) {
      config.root_block_device = {
        volume_size: 8,
        volume_type: 'gp3',
        delete_on_termination: true,
        encrypted: false
      };
      transformations.push('Added default root_block_device configuration');
    }

    // Initialize empty ebs_block_device array if not present
    if (!config.ebs_block_device) {
      config.ebs_block_device = [];
    }

    // Find subnet reference from parentId
    if (!config.subnet_id && frontendNode.parentId) {
      const parent = containerMapping.get(frontendNode.parentId);
      if (parent && parent.resourceType.includes('subnet')) {
        config.subnet_id = parent.id;
        transformations.push(`Added subnet reference: ${parent.id}`);
      } else {
        // Look for subnet in the subnetId field from configuration
        if (config.subnetId) {
          config.subnet_id = config.subnetId;
          delete config.subnetId;
          transformations.push(`Mapped subnetId to subnet_id: ${config.subnet_id}`);
        }
      }
    }

    // Transform security groups
    if (config.securityGroups && Array.isArray(config.securityGroups)) {
      config.security_group_ids = config.securityGroups;
      delete config.securityGroups;
      transformations.push('securityGroups → security_group_ids');
    } else if (!config.security_group_ids) {
      config.security_group_ids = [];
      transformations.push('Initialized empty security_group_ids array');
    }

    // Handle key pair name
    if (config.keyPairName) {
      config.key_name = config.keyPairName;
      delete config.keyPairName;
      transformations.push('keyPairName → key_name');
    }
  }

  /**
   * Transform security group configuration
   */
  private static transformSecurityGroupConfiguration(config: Record<string, any>, transformations: string[]): void {
    // Map frontend security group properties to backend format
    if (!config.name && !config.description) {
      config.description = 'Security group created by Darch';
      transformations.push('Added default description');
    }

    // Transform ingress and egress rules
    if (config.ingressRules && Array.isArray(config.ingressRules)) {
      config.ingress_rules = config.ingressRules.map((rule: any) => ({
        from_port: rule.port === 'all' ? 0 : rule.port,
        to_port: rule.port === 'all' ? 0 : rule.port,
        protocol: rule.protocol === 'all' ? '-1' : rule.protocol,
        cidr_blocks: rule.source ? [rule.source] : [],
        description: rule.description || ''
      }));
      delete config.ingressRules;
      transformations.push('ingressRules → ingress_rules');
    } else if (!config.ingress_rules) {
      config.ingress_rules = [];
    }

    if (config.egressRules && Array.isArray(config.egressRules)) {
      config.egress_rules = config.egressRules.map((rule: any) => ({
        from_port: rule.port === 'all' ? 0 : rule.port,
        to_port: rule.port === 'all' ? 0 : rule.port,
        protocol: rule.protocol === 'all' ? '-1' : rule.protocol,
        cidr_blocks: rule.destination ? [rule.destination] : [],
        description: rule.description || ''
      }));
      delete config.egressRules;
      transformations.push('egressRules → egress_rules');
    } else if (!config.egress_rules) {
      config.egress_rules = [];
    }

    // Find VPC reference
    if (!config.vpc_id && config.awsVpcId) {
      config.vpc_id = config.awsVpcId;
      transformations.push(`Added VPC reference: ${config.awsVpcId}`);
    }
  }

  /**
   * Transform S3 configuration
   */
  private static transformS3Configuration(config: Record<string, any>, transformations: string[]): void {
    // Map bucket name if needed
    if (config.bucketName && !config.bucket_name) {
      config.bucket_name = config.bucketName;
      delete config.bucketName;
      transformations.push('bucketName → bucket_name');
    }
  }

  /**
   * Find VPC for a given node by traversing parent containers
   */
  private static findVpcForNode(
    node: FrontendNode,
    containerMapping: Map<string, FrontendNode>
  ): FrontendNode | undefined {
    let currentNode = node;

    while (currentNode.parentId) {
      const parent = containerMapping.get(currentNode.parentId);
      if (!parent) break;

      if (parent.resourceType.includes('vpc')) {
        return parent;
      }

      currentNode = parent;
    }

    return undefined;
  }

  /**
   * Check if a node is contained within another container
   */
  private static isNodeInContainer(node: FrontendNode, container: FrontendNode): boolean {
    // Simple position-based containment check
    if (node.position && container.position && container.dimensions) {
      const nodeX = node.position.x;
      const nodeY = node.position.y;
      const containerX = container.position.x;
      const containerY = container.position.y;
      const containerWidth = container.dimensions.width;
      const containerHeight = container.dimensions.height;

      return nodeX >= containerX &&
             nodeX <= containerX + containerWidth &&
             nodeY >= containerY &&
             nodeY <= containerY + containerHeight;
    }

    return false;
  }

  /**
   * Determine if a container node should be converted to a service node
   */
  private static shouldConvertContainerToService(containerNode: FrontendNode): boolean {
    // Convert container nodes that represent actual AWS resources
    const convertibleTypes = [
      'aws-vpc',
      'aws-public-subnet',
      'aws-private-subnet',
      'aws-subnet'
    ];

    return convertibleTypes.includes(containerNode.resourceType);
  }

  /**
   * Transform connections from frontend to backend format
   */
  private static transformConnections(
    frontendConnections: any[],
    transformedNodes: ArchitectureNode[],
    warnings: string[]
  ): {
    transformedConnections: NodeConnection[];
    connectionWarnings: string[];
  } {
    const transformedConnections: NodeConnection[] = [];
    const connectionWarnings: string[] = [];
    const nodeIds = new Set(transformedNodes.map(n => n.id));

    for (const frontendConnection of frontendConnections) {
      try {
        // Create basic connection structure
        const connection: NodeConnection = {
          id: frontendConnection.id || `connection-${transformedConnections.length}`,
          source: frontendConnection.source || frontendConnection.sourceId,
          target: frontendConnection.target || frontendConnection.targetId,
          sourceHandle: frontendConnection.sourceHandle,
          targetHandle: frontendConnection.targetHandle,
          type: frontendConnection.type || frontendConnection.connectionType || 'dependency'
        };

        // Validate that source and target nodes exist
        if (!nodeIds.has(connection.source)) {
          connectionWarnings.push(`Connection source ${connection.source} not found in transformed nodes`);
          continue;
        }

        if (!nodeIds.has(connection.target)) {
          connectionWarnings.push(`Connection target ${connection.target} not found in transformed nodes`);
          continue;
        }

        transformedConnections.push(connection);

      } catch (error) {
        const errorMessage = `Failed to transform connection: ${error instanceof Error ? error.message : 'Unknown error'}`;
        connectionWarnings.push(errorMessage);
      }
    }

    // Add implicit connections based on parent-child relationships
    for (const node of transformedNodes) {
      if (node.parentId) {
        const parentExists = nodeIds.has(node.parentId);
        if (parentExists) {
          const implicitConnection: NodeConnection = {
            id: `implicit-${node.id}-${node.parentId}`,
            source: node.parentId,
            target: node.id,
            type: 'contains'
          };
          transformedConnections.push(implicitConnection);
        }
      }
    }

    return {
      transformedConnections,
      connectionWarnings
    };
  }

  /**
   * Create an empty architecture structure
   */
  private static createEmptyArchitecture(): ArchitectureData {
    return {
      metadata: {
        name: 'Empty Architecture',
        description: 'Failed to transform architecture',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        provider: 'aws'
      },
      nodes: [],
      connections: [],
      variables: {},
      outputs: {}
    };
  }

  /**
   * Validate frontend architecture data structure
   */
  static validateFrontendData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data) {
      errors.push('Architecture data is required');
      return { valid: false, errors };
    }

    if (!data.metadata) {
      errors.push('Metadata is required');
    } else {
      if (!data.metadata.name) {
        errors.push('Metadata name is required');
      }
      if (!data.metadata.provider) {
        errors.push('Metadata provider is required');
      }
    }

    if (!data.nodes || !Array.isArray(data.nodes)) {
      errors.push('Nodes array is required');
    } else if (data.nodes.length === 0) {
      errors.push('At least one node is required');
    }

    // Validate individual nodes
    for (const [index, node] of data.nodes.entries()) {
      if (!node.id) {
        errors.push(`Node at index ${index} is missing id`);
      }
      if (!node.resourceType) {
        errors.push(`Node ${node.id || index} is missing resourceType`);
      }
      if (!node.nodeType) {
        errors.push(`Node ${node.id || index} is missing nodeType`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Generate transformation summary
   */
  static generateTransformationSummary(result: TransformationResult): any {
    const summary = {
      totalNodes: result.transformed.nodes.length,
      totalConnections: result.transformed.connections.length,
      resourceTypes: {} as Record<string, number>,
      transformations: {} as Record<string, number>,
      warningsCount: result.warnings.length,
      errorsCount: result.errors.length,
      mappings: result.mappings.length
    };

    // Count resource types
    for (const node of result.transformed.nodes) {
      summary.resourceTypes[node.resourceType] = (summary.resourceTypes[node.resourceType] || 0) + 1;
    }

    // Count transformation types
    for (const mapping of result.mappings) {
      for (const transformation of mapping.transformations) {
        summary.transformations[transformation] = (summary.transformations[transformation] || 0) + 1;
      }
    }

    return summary;
  }
}
