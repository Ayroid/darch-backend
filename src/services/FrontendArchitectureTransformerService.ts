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
  cidrBlock: string; // Required: IPv4 CIDR block
  awsRegionId?: string;
  description?: string;
  enableDnsSupport?: boolean; // Default: true
  enableDnsHostnames?: boolean; // Default: false
  instanceTenancy?: "default" | "dedicated"; // Default: "default"
  assignGeneratedIpv6CidrBlock?: boolean; // Default: false
  ipv6CidrBlock?: string; // Optional: IPv6 CIDR block
  ipv6IpamPoolId?: string; // Optional: IPv6 IPAM pool ID
  ipv6NetmaskLength?: number; // Optional: IPv6 netmask length
  tags?: string | Record<string, string>; // string for backward compatibility
}

export interface FrontendEC2Configuration {
  // Basic Configuration
  awsEc2Id: string;
  instanceType: string; // Required: e.g., "t3.micro", "t2.micro"
  amiId: string; // Required: Amazon Machine Image ID
  keyPairName?: string;

  // Instance Details
  awsRegionId?: string;
  awsAvailabilityZone?: string;
  subnetId?: string;
  securityGroups?: string[]; // VPC security group IDs
  iamInstanceProfile?: string;

  // Storage
  rootVolumeSize?: number; // Default: 8 GB (AMI default)
  rootVolumeType?: "gp2" | "gp3" | "io1" | "io2" | "st1" | "sc1" | "standard";
  deleteOnTermination?: boolean; // Default: true
  encrypted?: boolean; // Default: false
  ebsOptimized?: boolean; // Default: false

  // Monitoring & Management
  detailedMonitoring?: boolean; // Default: false
  terminationProtection?: boolean; // Default: false
  autoRecovery?: boolean; // Default: true
  shutdownBehavior?: "stop" | "terminate"; // Default: "stop"

  // User Data
  userData?: string; // Base64 encoded user data script
  userDataReplaceOnChange?: boolean; // Default: false

  // Network Settings
  associatePublicIpAddress?: boolean; // Default: false
  enhancedNetworking?: boolean; // Default: false
  sriovNetSupport?: "simple"; // SR-IOV support
  privateIp?: string; // Primary private IPv4 address
  ipv6AddressCount?: number; // Number of IPv6 addresses
  ipv6Addresses?: string[]; // Specific IPv6 addresses

  // Placement
  tenancy?: "default" | "dedicated" | "host"; // Default: "default"
  hostId?: string;
  placementGroup?: string;
  availabilityZone?: string;

  // Instance Metadata Service (IMDSv2)
  metadataOptions?: {
    httpEndpoint?: "enabled" | "disabled"; // Default: "enabled"
    httpTokens?: "optional" | "required"; // Default: "optional"
    httpPutResponseHopLimit?: number; // Default: 1
    instanceMetadataTags?: "enabled" | "disabled"; // Default: "disabled"
  };

  // CPU Options
  cpuCoreCount?: number;
  cpuThreadsPerCore?: number;
  cpuCredits?: "standard" | "unlimited"; // For T2/T3 instances

  // Capacity Reservation
  capacityReservationSpecification?: {
    capacityReservationPreference?: "open" | "none";
    capacityReservationTarget?: {
      capacityReservationId?: string;
      capacityReservationResourceGroupArn?: string;
    };
  };

  // Tags
  tags?: Record<string, string>;
  volumeTags?: Record<string, string>; // Tags for EBS volumes
}

export interface FrontendPublicSubnetConfiguration {
  awsPublicSubnetId: string;
  cidrBlock: string; // Required: IPv4 CIDR block
  awsVpcId: string; // Required: VPC ID
  awsRegionId?: string;
  awsAvailabilityZone: string; // Required: Availability Zone
  availabilityZoneId?: string; // Optional: AZ ID
  description?: string;
  mapPublicIpOnLaunch: boolean; // Default: true for public subnets
  assignIpv6AddressOnCreation?: boolean; // Default: false
  customerOwnedIpv4Pool?: string; // Optional: Customer owned IPv4 pool
  enableDns64?: boolean; // Default: false
  enableResourceNameDnsARecordOnLaunch?: boolean; // Default: false
  enableResourceNameDnsAAAARecordOnLaunch?: boolean; // Default: false
  ipv6CidrBlock?: string; // Optional: IPv6 CIDR block
  ipv6Native?: boolean; // Default: false (IPv6-only subnet)
  outpostArn?: string; // Optional: Outpost ARN
  privateDnsHostnameTypeOnLaunch?: "ip-name" | "resource-name"; // Default: "ip-name"
  tags?: string | Record<string, string>;
}

export interface FrontendPrivateSubnetConfiguration {
  awsPrivateSubnetId: string;
  cidrBlock: string; // Required: IPv4 CIDR block
  awsVpcId: string; // Required: VPC ID
  awsRegionId?: string;
  awsAvailabilityZone: string; // Required: Availability Zone
  availabilityZoneId?: string; // Optional: AZ ID
  description?: string;
  mapPublicIpOnLaunch: boolean; // Default: false for private subnets
  enableNatGateway?: boolean; // Custom field for Darch
  assignIpv6AddressOnCreation?: boolean; // Default: false
  customerOwnedIpv4Pool?: string; // Optional: Customer owned IPv4 pool
  enableDns64?: boolean; // Default: false
  enableResourceNameDnsARecordOnLaunch?: boolean; // Default: false
  enableResourceNameDnsAAAARecordOnLaunch?: boolean; // Default: false
  ipv6CidrBlock?: string; // Optional: IPv6 CIDR block
  ipv6Native?: boolean; // Default: false (IPv6-only subnet)
  outpostArn?: string; // Optional: Outpost ARN
  privateDnsHostnameTypeOnLaunch?: "ip-name" | "resource-name"; // Default: "ip-name"
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
  name?: string; // Security group name
  namePrefix?: string; // Creates unique name beginning with prefix
  groupId?: string; // The ID of the security group (output)
  awsVpcId: string; // Required: VPC ID
  description?: string; // Default: "Managed by Terraform"
  ingressRules: FrontendSecurityGroupRule[]; // Ingress rules
  egressRules: FrontendSecurityGroupRule[]; // Egress rules
  revokeRulesOnDelete?: boolean; // Default: false
  tags?: Record<string, string>;
}

export interface FrontendSecurityGroupRule {
  protocol: "tcp" | "udp" | "icmp" | "icmpv6" | "all" | string; // Protocol (-1 for all)
  fromPort?: number; // Start of port range
  toPort?: number; // End of port range
  port?: number | string; // Simplified port (for backward compatibility)
  cidrBlocks?: string[]; // IPv4 CIDR blocks
  ipv6CidrBlocks?: string[]; // IPv6 CIDR blocks
  source?: string; // CIDR or security group ID for ingress (backward compatibility)
  destination?: string; // CIDR or security group ID for egress (backward compatibility)
  sourceSecurityGroupId?: string; // Source security group ID
  selfReference?: boolean; // Reference to the security group itself
  prefixListIds?: string[]; // Prefix list IDs
  description?: string;
}

export interface FrontendInternetGatewayConfiguration {
  awsInternetGatewayId: string;
  awsVpcId?: string;
  description?: string;
  state?: "available" | "attaching" | "attached" | "detaching" | "detached";
  tags?: Record<string, string>;
}

export interface FrontendNATGatewayConfiguration {
  awsNatGatewayId: string;
  awsSubnetId: string; // Required: Subnet ID for the NAT Gateway
  allocationId?: string; // Elastic IP allocation ID (required for public NAT Gateway)
  connectivityType?: "public" | "private"; // Default: "public"
  privateIp?: string; // Private IPv4 address (for private NAT Gateway)
  secondaryAllocationIds?: string[]; // Secondary EIP allocation IDs
  secondaryPrivateIpAddressCount?: number; // Number of secondary private IPs
  secondaryPrivateIpAddresses?: string[]; // Secondary private IP addresses
  state?: "pending" | "failed" | "available" | "deleting" | "deleted"; // Status (output)
  description?: string;
  tags?: Record<string, string>;
}

export interface FrontendRouteTableConfiguration {
  awsRouteTableId: string;
  awsVpcId: string; // Required: VPC ID
  awsInternetGatewayId?: string; // For convenience (not AWS parameter)
  awsSubnetId?: string; // For convenience (not AWS parameter)
  routes: FrontendRoute[]; // Routes (can be empty, local route is implicit)
  associations: FrontendRouteTableAssociation[]; // Subnet associations
  propagatingVgws?: string[]; // List of virtual gateways for route propagation
  description?: string;
  tags?: Record<string, string>;
}

export interface FrontendRoute {
  // Destination (one required)
  destinationCidrBlock?: string; // IPv4 CIDR block
  destinationIpv6CidrBlock?: string; // IPv6 CIDR block
  destinationPrefixListId?: string; // Prefix list ID

  // Target (one required)
  gatewayId?: string; // Internet Gateway or Virtual Private Gateway ID
  egressOnlyGatewayId?: string; // Egress Only Internet Gateway ID (IPv6)
  instanceId?: string; // EC2 instance ID
  natGatewayId?: string; // NAT Gateway ID
  localGatewayId?: string; // Local Gateway ID
  networkInterfaceId?: string; // Network Interface ID
  transitGatewayId?: string; // Transit Gateway ID
  vpcEndpointId?: string; // VPC Endpoint ID
  vpcPeeringConnectionId?: string; // VPC Peering Connection ID
  carrierGatewayId?: string; // Carrier Gateway ID
  coreNetworkArn?: string; // Core Network ARN

  // Status (output)
  state?: "active" | "blackhole";
}

export interface FrontendRouteTableAssociation {
  associationId?: string; // Association ID (output)
  subnetId?: string; // Subnet ID to associate
  gatewayId?: string; // Gateway ID to associate
  main?: boolean; // Whether this is the main route table
}

export type FrontendAWSResourceConfiguration =
  | FrontendVPCConfiguration
  | FrontendEC2Configuration
  | FrontendPublicSubnetConfiguration
  | FrontendPrivateSubnetConfiguration
  | FrontendAWSRegionConfiguration
  | FrontendAvailabilityZoneConfiguration
  | FrontendSecurityGroupConfiguration
  | FrontendInternetGatewayConfiguration
  | FrontendNATGatewayConfiguration
  | FrontendRouteTableConfiguration
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

    logger.architecture(LogLevel.INFO, 'Transforming frontend architecture', {
      nodes: frontendData.nodes?.length || 0,
      connections: frontendData.connections?.length || 0
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

      logger.architecture(LogLevel.INFO, 'Frontend transformation completed', {
        nodes: transformedNodes.length,
        warnings: warnings.length,
        errors: errors.length,
        duration
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
      logger.error('Architecture transformation failed', {
        error: errorMessage,
        category: LogCategory.ARCHITECTURE
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

        // Set parentId only for resources that truly need parent-child relationships
        // For most AWS resources, explicit configuration (vpc_id, subnet_id) is preferred over parent-child
        if (parentId && containerMapping.has(parentId)) {
          const parentContainer = containerMapping.get(parentId)!;

          // Only set parent relationships for resources that benefit from containment
          // Most AWS resources will use explicit vpc_id, subnet_id references instead
          if (parentContainer.resourceType.includes('subnet') &&
              frontendNode.resourceType === 'aws-ec2') {
            // EC2 instances can have subnet as parent for visual hierarchy
            actualParent = parentId;
            transformations.push(`Kept subnet parent for EC2 instance`);
          }
          // For other resources, avoid parent-child to prevent circular dependencies
          // They will use explicit configuration fields instead (vpc_id, etc.)
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
        logger.error('Node transformation failed', {
          error: errorMessage,
          nodeId: frontendNode.id,
          category: LogCategory.ARCHITECTURE
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
      'aws-internet-gateway': { backend: 'internet-gateway', nodeType: 'awsService' },
      'aws-route-table': { backend: 'route-table', nodeType: 'awsService' },
      'aws-s3': { backend: 's3', nodeType: 'awsService' },
      'aws-rds': { backend: 'rds', nodeType: 'awsService' },

      // Generic mappings
      'vpc': { backend: 'vpc', nodeType: 'awsService' },
      'subnet': { backend: 'subnet', nodeType: 'awsService' },
      'ec2': { backend: 'ec2', nodeType: 'awsService' },
      'security-group': { backend: 'security-group', nodeType: 'awsService' },
      'internet-gateway': { backend: 'internet-gateway', nodeType: 'awsService' },
      'route-table': { backend: 'route-table', nodeType: 'awsService' },
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

    // Transform specific configuration based on resource type (BEFORE removing frontend fields)
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
      case 'aws-internet-gateway':
        this.transformInternetGatewayConfiguration(config, frontendNode, containerMapping, transformations);
        break;
      case 'aws-nat-gateway':
        this.transformNatGatewayConfiguration(config, frontendNode, containerMapping, transformations);
        break;
      case 'aws-route-table':
        this.transformRouteTableConfiguration(config, frontendNode, containerMapping, transformations);
        break;
      case 'aws-s3':
        this.transformS3Configuration(config, transformations);
        break;
    }

    // Clean up remaining frontend-specific configuration properties AFTER transformations
    if ('awsRegionId' in config) delete config.awsRegionId;
    if ('awsAvailabilityZone' in config) delete config.awsAvailabilityZone;
    if ('awsPublicSubnetId' in config) delete config.awsPublicSubnetId;
    if ('awsPrivateSubnetId' in config) delete config.awsPrivateSubnetId;
    if ('awsEc2Id' in config) delete config.awsEc2Id;
    if ('awsSecurityGroupId' in config) delete config.awsSecurityGroupId;
    if ('awsAvailabilityZoneId' in config) delete config.awsAvailabilityZoneId;
    // Note: awsVpcId and awsInternetGatewayId are cleaned up by individual transformation methods

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
      // First try to find actual VPC from parent chain (more reliable than awsVpcId)
      if (frontendNode.parentId) {
        const vpc = this.findVpcForNode(frontendNode, containerMapping);
        if (vpc) {
          config.vpc_id = vpc.id;
          transformations.push(`Added VPC reference from parent: ${vpc.id}`);
        }
      }

      // Fallback to awsVpcId only if no VPC found from parents
      if (!config.vpc_id && config.awsVpcId && config.awsVpcId !== "default-vpc") {
        config.vpc_id = config.awsVpcId;
        transformations.push(`Added VPC reference from awsVpcId: ${config.awsVpcId}`);
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
   * Transform Internet Gateway configuration
   */
  private static transformInternetGatewayConfiguration(
    config: Record<string, any>,
    frontendNode: FrontendNode,
    containerMapping: Map<string, FrontendNode>,
    transformations: string[]
  ): void {
    // Map awsInternetGatewayId to name if needed
    if (config.awsInternetGatewayId && !config.name) {
      config.name = config.awsInternetGatewayId;
      transformations.push('awsInternetGatewayId → name');
    }

    // Find VPC reference from parent containers or configuration
    if (!config.vpc_id) {
      // First check for explicit awsVpcId in config
      if (config.awsVpcId && config.awsVpcId !== "default-vpc") {
        config.vpc_id = config.awsVpcId;
        transformations.push(`Added VPC reference from awsVpcId: ${config.awsVpcId}`);
      } else if (frontendNode.parentId) {
        // Try to find VPC from parent chain
        let currentParent: string | undefined = frontendNode.parentId;
        let vpc: FrontendNode | undefined;

        // Walk up the parent chain to find VPC
        while (currentParent && !vpc) {
          const parent = containerMapping.get(currentParent);
          if (parent) {
            if (parent.resourceType === 'aws-vpc') {
              vpc = parent;
            } else {
              currentParent = parent.parentId;
            }
          } else {
            break;
          }
        }

        if (vpc) {
          config.vpc_id = vpc.id;
          transformations.push(`Added VPC reference from parent chain: ${vpc.id}`);
        }
      }
    }

    // Remove frontend-specific fields
    if (config.awsInternetGatewayId) delete config.awsInternetGatewayId;
    if (config.awsVpcId) delete config.awsVpcId;

    // Set default create_default_route_to_internet if not specified
    if (config.createDefaultRoute === undefined && config.create_default_route_to_internet === undefined) {
      config.create_default_route_to_internet = true;
      transformations.push('Added default create_default_route_to_internet: true');
    } else if (config.createDefaultRoute !== undefined && config.create_default_route_to_internet === undefined) {
      config.create_default_route_to_internet = config.createDefaultRoute;
      delete config.createDefaultRoute;
      transformations.push('createDefaultRoute → create_default_route_to_internet');
    }

    // Handle description and state fields
    if (config.description) {
      transformations.push('Preserved description field');
    }

    if (config.state) {
      transformations.push(`Preserved state: ${config.state}`);
    }
  }

  /**
   * Transform NAT Gateway configuration
   */
  private static transformNatGatewayConfiguration(
    config: Record<string, any>,
    frontendNode: FrontendNode,
    containerMapping: Map<string, FrontendNode>,
    transformations: string[]
  ): void {
    // Map awsNatGatewayId to name if needed
    if (config.awsNatGatewayId && !config.name) {
      config.name = config.awsNatGatewayId;
      transformations.push('awsNatGatewayId → name');
    }

    // Handle connectivityType → connectivity_type (from Phase 4 frontend changes)
    if (config.connectivityType && !config.connectivity_type) {
      config.connectivity_type = config.connectivityType;
      transformations.push(`connectivityType → connectivity_type: ${config.connectivityType}`);
    }
    if (config.connectivityType) delete config.connectivityType;

    // Handle legacy natGatewayType → connectivity_type (backward compatibility)
    if (config.natGatewayType && !config.connectivity_type) {
      config.connectivity_type = config.natGatewayType;
      transformations.push(`natGatewayType → connectivity_type: ${config.natGatewayType}`);
    }
    if (config.natGatewayType) delete config.natGatewayType;

    // Find subnet reference (NAT Gateway requires public subnet)
    if (!config.subnet_id) {
      // First check for explicit awsPublicSubnetId in config
      if (config.awsPublicSubnetId && config.awsPublicSubnetId !== "default-subnet") {
        config.subnet_id = config.awsPublicSubnetId;
        transformations.push(`Added subnet reference from awsPublicSubnetId: ${config.awsPublicSubnetId}`);
      } else if (config.awsSubnetId && config.awsSubnetId !== "default-subnet") {
        config.subnet_id = config.awsSubnetId;
        transformations.push(`Added subnet reference from awsSubnetId: ${config.awsSubnetId}`);
      } else if (frontendNode.parentId) {
        // Try to find public subnet from parent chain
        let currentParent: string | undefined = frontendNode.parentId;
        let subnet: FrontendNode | undefined;

        // Walk up the parent chain to find public subnet
        while (currentParent && !subnet) {
          const parent = containerMapping.get(currentParent);
          if (parent) {
            const config = parent.configuration as any;
            if (parent.resourceType === 'aws-public-subnet' ||
                (parent.resourceType === 'aws-subnet' && config?.mapPublicIpOnLaunch === true)) {
              subnet = parent;
            } else {
              currentParent = parent.parentId;
            }
          } else {
            break;
          }
        }

        if (subnet) {
          config.subnet_id = subnet.id;
          transformations.push(`Added subnet reference from parent chain: ${subnet.id}`);
        }
      }
    }

    // Handle Elastic IP allocation
    if (config.allocationId && !config.allocation_id) {
      config.allocation_id = config.allocationId;
      transformations.push('allocationId → allocation_id');
    }
    if (config.allocationId) delete config.allocationId;

    // Handle private IP
    if (config.privateIp && !config.private_ip) {
      config.private_ip = config.privateIp;
      transformations.push('privateIp → private_ip');
    }
    if (config.privateIp) delete config.privateIp;

    // Handle createEip → create_eip
    if (config.createEip !== undefined && config.create_eip === undefined) {
      config.create_eip = config.createEip;
      transformations.push('createEip → create_eip');
    }
    if (config.createEip !== undefined) delete config.createEip;

    // Set default connectivity_type if not specified
    if (!config.connectivity_type) {
      config.connectivity_type = 'public';
      transformations.push('Set default connectivity_type: public');
    }

    // Set default create_eip if connectivity is public and no allocation_id
    if (config.connectivity_type === 'public' && !config.allocation_id && config.create_eip === undefined) {
      config.create_eip = true;
      transformations.push('Set default create_eip: true for public NAT Gateway');
    }

    // Remove unsupported advanced fields
    const removedFields = [
      'awsNatGatewayId',
      'awsSubnetId',
      'awsPublicSubnetId',
      'secondaryAllocationIds',
      'secondaryPrivateIpAddressCount',
      'secondaryPrivateIpAddresses',
      'state',
      'description'
    ];

    removedFields.forEach(field => {
      if (config[field]) {
        delete config[field];
        transformations.push(`Removed unsupported field: ${field}`);
      }
    });
  }

  /**
   * Transform Route Table configuration
   */
  private static transformRouteTableConfiguration(
    config: Record<string, any>,
    frontendNode: FrontendNode,
    containerMapping: Map<string, FrontendNode>,
    transformations: string[]
  ): void {
    // Find VPC reference from parent containers or configuration
    if (!config.vpc_id) {
      if (config.awsVpcId) {
        config.vpc_id = config.awsVpcId;
        transformations.push(`Added VPC reference from awsVpcId: ${config.awsVpcId}`);
      } else if (frontendNode.parentId) {
        const vpc = this.findVpcForNode(frontendNode, containerMapping);
        if (vpc) {
          config.vpc_id = vpc.id;
          transformations.push(`Added VPC reference from parent: ${vpc.id}`);
        }
      }
    }

    // Transform routes configuration to map format (not array)
    if (config.routes && typeof config.routes === 'object' && !Array.isArray(config.routes)) {
      // If routes is already an object/map, transform it to proper format
      const transformedRoutes: Record<string, any> = {};

      Object.entries(config.routes).forEach(([routeName, routeConfig]: [string, any]) => {
        const transformedRoute: any = {
          destination_cidr_block: routeConfig.destination_cidr_block || routeConfig.destinationCidrBlock || '0.0.0.0/0'
        };

        // Handle different route targets
        if (routeConfig.gateway_id || routeConfig.gatewayId) {
          transformedRoute.gateway_id = routeConfig.gateway_id || routeConfig.gatewayId;
        } else if (routeConfig.nat_gateway_id || routeConfig.natGatewayId) {
          transformedRoute.nat_gateway_id = routeConfig.nat_gateway_id || routeConfig.natGatewayId;
        } else if (routeConfig.vpc_peering_connection_id || routeConfig.vpcPeeringConnectionId) {
          transformedRoute.vpc_peering_connection_id = routeConfig.vpc_peering_connection_id || routeConfig.vpcPeeringConnectionId;
        }

        transformedRoutes[routeName] = transformedRoute;
      });

      config.routes = transformedRoutes;
      transformations.push('Transformed routes object to map format');
    } else if (Array.isArray(config.routes) || !config.routes) {
      // If routes is an array or doesn't exist, initialize as empty map
      config.routes = {};
      transformations.push('Initialized routes as empty map');
    }

    // Handle awsInternetGatewayId from configuration - create default route
    if (config.awsInternetGatewayId) {
      if (!config.routes) {
        config.routes = {};
      }
      config.routes['default_route'] = {
        destination_cidr_block: '0.0.0.0/0',
        gateway_id: config.awsInternetGatewayId
      };
      transformations.push('Created default route from awsInternetGatewayId');
    }

    // Transform associations configuration to map format
    if (config.associations && Array.isArray(config.associations)) {
      // Convert array to map
      const associationsMap: Record<string, any> = {};
      config.associations.forEach((assoc: any, index: number) => {
        const key = assoc.subnet_id ? `subnet_${assoc.subnet_id}` : `association_${index}`;
        associationsMap[key] = assoc;
      });
      config.associations = associationsMap;
      transformations.push('Transformed associations array to map format');
    } else if (config.associations && typeof config.associations === 'object') {
      // Already a map, keep it
      transformations.push('Preserved associations map format');
    } else {
      // Initialize as empty map
      config.associations = {};
      transformations.push('Initialized associations as empty map');
    }

    // Handle awsSubnetId from configuration - create subnet association
    if (config.awsSubnetId) {
      if (!config.associations) {
        config.associations = {};
      }
      config.associations['subnet_association'] = {
        subnet_id: config.awsSubnetId
      };
      transformations.push('Created subnet association from awsSubnetId');
    }

    // Transform subnet associations (legacy field name)
    if (config.subnetAssociations) {
      if (!config.associations) {
        config.associations = {};
      }
      if (Array.isArray(config.subnetAssociations)) {
        config.subnetAssociations.forEach((subnetId: string, index: number) => {
          config.associations![`subnet_${index}`] = { subnet_id: subnetId };
        });
      }
      delete config.subnetAssociations;
      transformations.push('subnetAssociations → associations');
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
