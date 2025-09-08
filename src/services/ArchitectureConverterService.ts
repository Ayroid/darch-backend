import { 
  CleanArchitectureData, 
  ProjectMetadata, 
  InfrastructureSpec,
  NetworkConfiguration,
  ComputeConfiguration,
  SecurityConfigurat  /**
   * Filter out container nodes that are not actual infrastructure resources
   */
  private static filterInfrastructureNodes(nodes: ArchitectureNode[]): ArchitectureNode[] {
    // Remove container types - both old verbose format and potential new format
    const containerTypes = [
      'aws-region', 'aws-availability-zone', 'region-container', 'az-container',
      'region', 'availability-zone', 'az'  // Add support for cleaner format
    ];
    return nodes.filter(node => !containerTypes.includes(node.resourceType.toLowerCase()));
  }ResourceDependency 
} from '../models/CleanArchitecture.js';
import { ArchitectureData, ArchitectureNode, NodeConnection } from '../models/Architecture.js';

/**
 * Service to convert between clean and legacy architecture data formats
 */
export class ArchitectureConverterService {

  /**
   * Convert from legacy format to clean format
   */
  static convertFromLegacy(legacyData: ArchitectureData): CleanArchitectureData {
    console.log('🔄 Converting from legacy format to clean format...');
    
    const cleanData: CleanArchitectureData = {
      metadata: this.convertMetadata(legacyData.metadata, legacyData.nodes || []),
      infrastructure: this.convertInfrastructure(legacyData.nodes || []),
      deployment: this.convertDeployment(legacyData)
    };

    console.log('✅ Conversion to clean format completed');
    return cleanData;
  }

  /**
   * Convert variables from legacy format to clean format
   */
  private static convertVariables(variables: any): Record<string, any> {
    const result: Record<string, any> = {};
    
    Object.entries(variables).forEach(([key, value]: [string, any]) => {
      if (typeof value === 'object' && value !== null) {
        result[key] = {
          description: value.description || '',
          type: value.type || 'string',
          default_value: value.default || value.default_value || undefined
        };
      } else {
        result[key] = {
          description: '',
          type: 'string',
          default_value: value
        };
      }
    });
    
    return result;
  }

  /**
   * Convert dependencies from connectionsm legacy format to clean format...');

    const cleanData: CleanArchitectureData = {
      metadata: this.convertMetadata(legacyData.metadata, legacyData.nodes),
      infrastructure: this.convertInfrastructure(legacyData.nodes),
      deployment: this.convertDeployment(legacyData)
    };

    console.log('✅ Conversion to clean format completed');
    return cleanData;
  }

  /**
   * Convert from clean format to legacy format
   */
  static convertToLegacy(cleanData: CleanArchitectureData): ArchitectureData {
    console.log('🔄 Converting from clean format to legacy format...');

    const legacyData: ArchitectureData = {
      metadata: this.convertMetadataToLegacy(cleanData.metadata),
      nodes: this.convertNodesToLegacy(cleanData.infrastructure, cleanData.metadata),
      connections: this.convertConnectionsToLegacy(cleanData.deployment.dependencies),
      variables: cleanData.deployment.variables || {},
      outputs: cleanData.deployment.outputs || {}
    };

    console.log('✅ Conversion to legacy format completed');
    return legacyData;
  }

  // ===== LEGACY TO CLEAN CONVERSION =====

  /**
   * Convert legacy metadata to clean metadata
   */
  private static convertMetadata(legacyMetadata: any, nodes: ArchitectureNode[]): ProjectMetadata {
    // Infer provider and region from nodes if not explicitly set
    const regionNode = nodes.find(n => n.resourceType === 'aws-region');
    const vpcNode = nodes.find(n => n.resourceType === 'aws-vpc');
    
    const provider = legacyMetadata?.provider || 'aws';
    const region = legacyMetadata?.region || 
                   regionNode?.configuration?.region || 
                   vpcNode?.configuration?.awsRegionId || 
                   'us-east-1';

    return {
      name: legacyMetadata?.name || 'untitled-project',
      description: legacyMetadata?.description,
      version: legacyMetadata?.version || '1.0.0',
      provider: {
        name: provider,
        region: region
      },
      environment: legacyMetadata?.environment || 'development',
      project: legacyMetadata?.project || 'infrastructure',
      createdAt: legacyMetadata?.createdAt || new Date().toISOString(),
      lastModified: legacyMetadata?.lastModified || new Date().toISOString(),
      tags: {
        Environment: legacyMetadata?.environment || 'development',
        Project: legacyMetadata?.project || 'infrastructure',
        ManagedBy: 'Darch',
        ...legacyMetadata?.tags
      }
    };
  }

  /**
   * Convert legacy nodes to clean infrastructure spec
   * Now handles both old format and new frontend format with aws-* prefixes
   */
  private static convertInfrastructure(nodes: ArchitectureNode[]): InfrastructureSpec {
    // Filter and categorize nodes
    const infrastructureNodes = this.filterInfrastructureNodes(nodes);
    
    const vpcNodes = infrastructureNodes.filter(n => this.isVPCNode(n.resourceType));
    const subnetNodes = infrastructureNodes.filter(n => this.isSubnetNode(n.resourceType));
    const ec2Nodes = infrastructureNodes.filter(n => this.isEC2Node(n.resourceType));
    const securityGroupNodes = infrastructureNodes.filter(n => this.isSecurityGroupNode(n.resourceType));

    return {
      network: this.convertNetworkConfiguration(vpcNodes, subnetNodes),
      compute: this.convertComputeConfiguration(ec2Nodes),
      storage: { s3_buckets: [] }, // Empty for now, can be extended
      security: this.convertSecurityConfiguration(securityGroupNodes)
    };
  }

  /**
   * Filter out container nodes and keep only infrastructure service nodes
   */
  private static filterInfrastructureNodes(nodes: ArchitectureNode[]): ArchitectureNode[] {
    const containerTypes = ['aws-region', 'aws-availability-zone', 'region-container', 'az-container'];
    return nodes.filter(node => !containerTypes.includes(node.resourceType.toLowerCase()));
  }

  /**
   * Check if node is a VPC type
   */
  private static isVPCNode(resourceType: string): boolean {
    const vpcTypes = ['vpc', 'aws-vpc'];
    return vpcTypes.includes(resourceType.toLowerCase());
  }

  /**
   * Check if node is a subnet type
   */
  private static isSubnetNode(resourceType: string): boolean {
    const subnetTypes = [
      'subnet', 'aws-subnet', 'aws-private-subnet', 'aws-public-subnet',
      'private-subnet', 'public-subnet'
    ];
    return subnetTypes.includes(resourceType.toLowerCase());
  }

  /**
   * Check if node is an EC2 type
   */
  private static isEC2Node(resourceType: string): boolean {
    const ec2Types = ['ec2', 'aws-ec2', 'instance', 'aws-instance'];
    return ec2Types.includes(resourceType.toLowerCase());
  }

  /**
   * Check if node is a security group type
   */
  private static isSecurityGroupNode(resourceType: string): boolean {
    const sgTypes = ['security-group', 'aws-security-group', 'sg'];
    return sgTypes.includes(resourceType.toLowerCase());
  }

  /**
   * Map enhanced resource type to simplified backend format
   */
  private static mapResourceTypeToBackendFormat(resourceType: string): string {
    const typeMap: Record<string, string> = {
      // Container types (should be filtered out or converted)
      'aws-region': 'region-container',
      'aws-availability-zone': 'az-container',

      // Networking
      'aws-vpc': 'vpc',
      'vpc': 'vpc',
      'aws-subnet': 'subnet',
      'aws-private-subnet': 'subnet',
      'aws-public-subnet': 'subnet',
      'subnet': 'subnet',
      'private-subnet': 'subnet',
      'public-subnet': 'subnet',

      // Compute
      'aws-ec2': 'ec2',
      'ec2': 'ec2',
      'aws-instance': 'ec2',
      'instance': 'ec2',

      // Security
      'aws-security-group': 'security-group',
      'security-group': 'security-group',
      'sg': 'security-group',

      // Storage
      'aws-s3': 's3',
      's3': 's3',
      'bucket': 's3',
      's3-bucket': 's3',

      // Database
      'aws-rds': 'rds',
      'rds': 'rds',
      'database': 'rds'
    };

    const mappedType = typeMap[resourceType.toLowerCase()];
    if (!mappedType) {
      console.warn(`⚠️ No type mapping found for resource type: ${resourceType}, using as-is`);
      return resourceType;
    }

    return mappedType;
  }

  /**
   * Convert network-related nodes with enhanced configuration mapping
   */
  private static convertNetworkConfiguration(
    vpcNodes: ArchitectureNode[], 
    subnetNodes: ArchitectureNode[]
  ): NetworkConfiguration {
    const vpc = vpcNodes[0]; // Assume single VPC for now
    
    if (!vpc) {
      throw new Error('No VPC found in architecture');
    }

    // Handle both old and new configuration formats
    const vpcConfig = this.normalizeVPCConfiguration(vpc.configuration);

    return {
      vpc: {
        id: vpc.id,
        name: vpc.name,
        cidr_block: vpcConfig.cidr_block || vpcConfig.cidrBlock || '10.0.0.0/16',
        enable_dns_hostnames: vpcConfig.enable_dns_hostnames ?? vpcConfig.enableDnsHostnames ?? true,
        enable_dns_support: vpcConfig.enable_dns_support ?? vpcConfig.enableDnsSupport ?? true,
        tags: this.extractTags(vpcConfig.tags) || { Name: vpc.name }
      },
      subnets: subnetNodes.map(subnet => this.convertSubnetConfiguration(subnet))
    };
  }

  /**
   * Normalize VPC configuration from different formats
   */
  private static normalizeVPCConfiguration(config: Record<string, any>): any {
    return {
      cidr_block: config.cidr_block || config.cidrBlock,
      enable_dns_hostnames: config.enable_dns_hostnames ?? config.enableDnsHostnames,
      enable_dns_support: config.enable_dns_support ?? config.enableDnsSupport,
      tags: config.tags
    };
  }

  /**
   * Convert subnet configuration with enhanced mapping
   */
  private static convertSubnetConfiguration(subnet: ArchitectureNode): any {
    const config = subnet.configuration;
    
    // Determine subnet type from resource type or configuration
    let subnetType = 'private';
    if (subnet.resourceType.includes('public') || config.subnet_type === 'public') {
      subnetType = 'public';
    } else if (subnet.resourceType.includes('private') || config.subnet_type === 'private') {
      subnetType = 'private';
    }

    // Handle different field name variations
    const vpcId = config.vpc_id || config.awsVpcId || this.findVPCIdFromParent(subnet);
    const cidrBlock = config.cidr_block || config.cidrBlock;
    const availabilityZone = config.availability_zone || config.awsAvailabilityZone || 'us-east-1a';
    const mapPublicIp = config.map_public_ip_on_launch ?? config.mapPublicIpOnLaunch ?? (subnetType === 'public');

    return {
      id: subnet.id,
      name: subnet.name,
      vpc_id: vpcId,
      cidr_block: cidrBlock,
      availability_zone: availabilityZone,
      type: subnetType,
      map_public_ip_on_launch: mapPublicIp,
      tags: this.extractTags(config.tags) || { Name: subnet.name, Type: subnetType }
    };
  }

  /**
   * Find VPC ID from parent hierarchy if not directly specified
   */
  private static findVPCIdFromParent(subnet: ArchitectureNode): string {
    // This would need access to all nodes to traverse the hierarchy
    // For now, we'll use a default or try to extract from configuration
    return subnet.parentId || 'main-vpc';
  }

  /**
   * Extract and normalize tags from different formats
   */
  private static extractTags(tags: any): Record<string, string> | undefined {
    if (!tags) return undefined;
    
    if (typeof tags === 'string') {
      // Handle comma-separated format: "Environment=Development,Type=Public"
      const tagObj: Record<string, string> = {};
      tags.split(',').forEach((tag: string) => {
        const [key, value] = tag.split('=');
        if (key && value) {
          tagObj[key.trim()] = value.trim();
        }
      });
      return Object.keys(tagObj).length > 0 ? tagObj : undefined;
    }
    
    if (typeof tags === 'object') {
      return tags as Record<string, string>;
    }
    
    return undefined;
  }

  /**
   * Convert compute-related nodes with enhanced configuration mapping
   */
  private static convertComputeConfiguration(ec2Nodes: ArchitectureNode[]): ComputeConfiguration {
    return {
      instances: ec2Nodes.map(instance => this.convertEC2Configuration(instance))
    };
  }

  /**
   * Convert EC2 instance configuration with field mapping
   */
  private static convertEC2Configuration(config: any): any {
    return {
      instance_type: config.instanceType || 't3.micro',
      ami_id: config.amiId || '',
      key_name: config.keyPairName || undefined,
      subnet_id: config.subnetId || '',
      security_group_ids: config.securityGroups || [],
      associate_public_ip_address: config.associatePublicIpAddress || false,
      root_block_device: {
        volume_type: config.rootVolumeType || 'gp3',
        volume_size: config.rootVolumeSize || 8,
        delete_on_termination: config.deleteOnTermination !== false,
        encrypted: config.encrypted || false
      },
      ebs_block_devices: [],
      monitoring: config.detailedMonitoring || false,
      disable_api_termination: config.terminationProtection || false,
      tenancy: config.tenancy || 'default',
      tags: this.convertTags(config.tags || {})
    };
  }

  /**
   * Convert tags from various formats to standardized format
   */
  private static convertTags(tags: any): Record<string, string> {
    if (typeof tags === 'string') {
      // Parse string format like "Environment=Development,Type=VPC"
      const result: Record<string, string> = {};
      tags.split(',').forEach((tag: string) => {
        const [key, value] = tag.split('=');
        if (key && value) {
          result[key.trim()] = value.trim();
        }
      });
      return result;
    }
    
    if (typeof tags === 'object' && tags !== null) {
      return { ...tags };
    }
    
    return {};
  }

  /**
   * Convert block device configuration from different formats
   */
  private static convertBlockDeviceConfiguration(config: Record<string, any>): any {
    // Check if root_block_device is already configured
    if (config.root_block_device) {
      return config.root_block_device;
    }
    
    // Build from individual fields
    return {
      volume_type: config.rootVolumeType || config.root_volume_type || 'gp3',
      volume_size: config.rootVolumeSize || config.root_volume_size || 8,
      delete_on_termination: config.deleteOnTermination ?? config.delete_on_termination ?? true,
      encrypted: config.encrypted ?? false
    };
  }

  /**
   * Convert security-related nodes
   */
  private static convertSecurityConfiguration(sgNodes: ArchitectureNode[]): SecurityConfiguration {
    return {
      security_groups: sgNodes.map(sg => ({
        id: sg.id,
        name: sg.configuration.name || sg.name,
        description: sg.configuration.description || 'Security group',
        vpc_id: sg.configuration.vpc_id,
        ingress_rules: sg.configuration.ingress_rules || [],
        egress_rules: sg.configuration.egress_rules || [],
        tags: sg.configuration.tags || {}
      }))
    };
  }

  /**
   * Convert deployment configuration
   */
  private static convertDeployment(legacyData: ArchitectureData): any {
    return {
      terraform: {
        version: '~> 1.0',
        required_providers: {
          aws: {
            source: 'hashicorp/aws',
            version: '~> 5.0'
          }
        }
      },
      dependencies: this.convertDependencies(legacyData.connections || []),
      variables: this.convertVariables(legacyData.variables || {}),
      outputs: legacyData.outputs || {},
      strategy: {
        type: 'single',
        rollback_on_failure: true,
        timeout: 3600
      }
    };
  }

  /**
   * Convert legacy connections to dependencies
   */
  private static convertDependencies(connections: NodeConnection[]): ResourceDependency[] {
    return connections.map(conn => ({
      source: conn.source,
      target: conn.target,
      type: 'explicit',
      relationship: this.mapConnectionTypeToRelationship(conn.type || 'dependency')
    }));
  }

  /**
   * Map connection type to relationship
   */
  private static mapConnectionTypeToRelationship(type: string): 'contains' | 'depends_on' | 'secures' | 'connects_to' {
    const mapping: Record<string, 'contains' | 'depends_on' | 'secures' | 'connects_to'> = {
      'contains': 'contains',
      'secures': 'secures',
      'connects_to': 'connects_to',
      'dependency': 'depends_on'
    };
    
    return mapping[type] || 'depends_on';
  }

  // ===== CLEAN TO LEGACY CONVERSION =====

  /**
   * Convert clean metadata to legacy metadata
   */
  private static convertMetadataToLegacy(metadata: ProjectMetadata): any {
    return {
      name: metadata.name,
      description: metadata.description,
      version: metadata.version,
      provider: metadata.provider.name,
      region: metadata.provider.region,
      environment: metadata.environment,
      project: metadata.project,
      createdAt: metadata.createdAt,
      lastModified: metadata.lastModified,
      tags: metadata.tags
    };
  }

  /**
   * Convert clean infrastructure to legacy nodes
   */
  private static convertNodesToLegacy(
    infrastructure: InfrastructureSpec, 
    metadata: ProjectMetadata
  ): ArchitectureNode[] {
    const nodes: ArchitectureNode[] = [];
    let positionCounter = { x: 100, y: 100 };

    // Convert VPC
    if (infrastructure.network?.vpc) {
      nodes.push(this.convertVPCToLegacy(infrastructure.network.vpc, positionCounter));
    }

    // Convert Subnets
    if (infrastructure.network?.subnets) {
      infrastructure.network.subnets.forEach(subnet => {
        nodes.push(this.convertSubnetToLegacy(subnet, positionCounter));
      });
    }

    // Convert Security Groups
    if (infrastructure.security?.security_groups) {
      infrastructure.security.security_groups.forEach(sg => {
        nodes.push(this.convertSecurityGroupToLegacy(sg, positionCounter));
      });
    }

    // Convert EC2 Instances
    if (infrastructure.compute?.instances) {
      infrastructure.compute.instances.forEach(instance => {
        nodes.push(this.convertEC2ToLegacy(instance, positionCounter));
      });
    }

    return nodes;
  }

  /**
   * Convert VPC to legacy format
   */
  private static convertVPCToLegacy(vpc: any, positionCounter: any): ArchitectureNode {
    const node: ArchitectureNode = {
      id: vpc.id,
      nodeType: 'awsService',
      resourceType: 'vpc',
      name: vpc.name,
      icon: 'vpc',
      position: { x: positionCounter.x, y: positionCounter.y },
      configuration: {
        cidr_block: vpc.cidr_block,
        enable_dns_hostnames: vpc.enable_dns_hostnames,
        enable_dns_support: vpc.enable_dns_support,
        tags: vpc.tags
      }
    };

    positionCounter.x += 150;
    return node;
  }

  /**
   * Convert Subnet to legacy format
   */
  private static convertSubnetToLegacy(subnet: any, positionCounter: any): ArchitectureNode {
    const node: ArchitectureNode = {
      id: subnet.id,
      nodeType: 'awsService',
      resourceType: 'subnet',
      name: subnet.name,
      icon: 'subnet',
      position: { x: positionCounter.x, y: positionCounter.y + 100 },
      configuration: {
        vpc_id: subnet.vpc_id,
        cidr_block: subnet.cidr_block,
        availability_zone: subnet.availability_zone,
        subnet_type: subnet.type,
        map_public_ip_on_launch: subnet.map_public_ip_on_launch,
        tags: subnet.tags
      }
    };

    positionCounter.x += 150;
    return node;
  }

  /**
   * Convert Security Group to legacy format
   */
  private static convertSecurityGroupToLegacy(sg: any, positionCounter: any): ArchitectureNode {
    const node: ArchitectureNode = {
      id: sg.id,
      nodeType: 'awsService',
      resourceType: 'security-group',
      name: sg.name,
      icon: 'security-group',
      position: { x: positionCounter.x, y: positionCounter.y + 200 },
      configuration: {
        name: sg.name,
        description: sg.description,
        vpc_id: sg.vpc_id,
        ingress_rules: sg.ingress_rules,
        egress_rules: sg.egress_rules,
        tags: sg.tags
      }
    };

    positionCounter.x += 150;
    return node;
  }

  /**
   * Convert EC2 Instance to legacy format
   */
  private static convertEC2ToLegacy(instance: any, positionCounter: any): ArchitectureNode {
    const node: ArchitectureNode = {
      id: instance.id,
      nodeType: 'awsService',
      resourceType: 'ec2',
      name: instance.name,
      icon: 'ec2',
      position: { x: positionCounter.x, y: positionCounter.y + 300 },
      configuration: {
        instance_type: instance.instance_type,
        ami_id: instance.ami_id,
        subnet_id: instance.subnet_id,
        security_group_ids: instance.security_group_ids,
        associate_public_ip_address: instance.associate_public_ip_address,
        root_block_device: instance.root_block_device,
        ebs_block_device: instance.ebs_block_devices || [],
        tags: instance.tags
      }
    };

    positionCounter.x += 150;
    return node;
  }

  /**
   * Convert dependencies to legacy connections
   */
  private static convertConnectionsToLegacy(dependencies: ResourceDependency[]): NodeConnection[] {
    return dependencies.map((dep, index) => ({
      id: `connection-${index}`,
      source: dep.source,
      target: dep.target,
      type: dep.relationship
    }));
  }

  // ===== VALIDATION UTILITIES =====

  /**
   * Validate clean architecture data
   */
  static validateCleanArchitecture(data: CleanArchitectureData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate metadata
    if (!data.metadata?.name) {
      errors.push('Project name is required');
    }

    if (!data.metadata?.provider?.name) {
      errors.push('Provider name is required');
    }

    // Validate infrastructure
    if (!data.infrastructure?.network?.vpc) {
      errors.push('VPC configuration is required');
    }

    if (!data.infrastructure?.network?.subnets?.length) {
      errors.push('At least one subnet is required');
    }

    // Validate VPC CIDR
    if (data.infrastructure?.network?.vpc?.cidr_block) {
      if (!this.isValidCIDR(data.infrastructure.network.vpc.cidr_block)) {
        errors.push('Invalid VPC CIDR block format');
      }
    }

    // Validate subnet CIDRs
    data.infrastructure?.network?.subnets?.forEach((subnet, index) => {
      if (!this.isValidCIDR(subnet.cidr_block)) {
        errors.push(`Invalid CIDR block format for subnet ${index + 1}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate CIDR format
   */
  private static isValidCIDR(cidr: string): boolean {
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    return cidrRegex.test(cidr);
  }

  // ===== EXAMPLE DATA GENERATORS =====

  /**
   * Generate example clean architecture data
   */
  static generateExampleCleanData(): CleanArchitectureData {
    return {
      metadata: {
        name: "Simple VPC with EC2",
        description: "Basic infrastructure with VPC, subnets, security group, and EC2 instances",
        version: "1.0.0",
        provider: {
          name: "aws",
          region: "us-east-1"
        },
        environment: "development",
        project: "simple-infrastructure",
        createdAt: "2025-09-08T17:00:00.000Z",
        lastModified: "2025-09-08T17:56:00.000Z",
        tags: {
          Environment: "development",
          Project: "simple-infrastructure",
          ManagedBy: "Darch"
        }
      },
      infrastructure: {
        network: {
          vpc: {
            id: "main-vpc",
            name: "main-vpc",
            cidr_block: "10.0.0.0/16",
            enable_dns_hostnames: true,
            enable_dns_support: true,
            tags: {
              Name: "main-vpc",
              Environment: "development"
            }
          },
          subnets: [
            {
              id: "private-subnet",
              name: "private-subnet",
              vpc_id: "main-vpc",
              cidr_block: "10.0.1.0/24",
              availability_zone: "us-east-1a",
              type: "private",
              map_public_ip_on_launch: false,
              tags: {
                Name: "private-subnet",
                Type: "Private"
              }
            },
            {
              id: "public-subnet",
              name: "public-subnet",
              vpc_id: "main-vpc",
              cidr_block: "10.0.2.0/24",
              availability_zone: "us-east-1a",
              type: "public",
              map_public_ip_on_launch: true,
              tags: {
                Name: "public-subnet",
                Type: "Public"
              }
            }
          ]
        },
        compute: {
          instances: [
            {
              id: "private-ec2",
              name: "private-instance",
              instance_type: "t3.micro",
              ami_id: "ami-0c55b159cbfafe1d0",
              subnet_id: "private-subnet",
              security_group_ids: ["web-security-group"],
              associate_public_ip_address: false,
              root_block_device: {
                volume_type: "gp3",
                volume_size: 8,
                delete_on_termination: true,
                encrypted: false
              },
              ebs_block_devices: [],
              tags: {
                Name: "private-instance",
                Environment: "development"
              }
            },
            {
              id: "public-ec2",
              name: "public-instance",
              instance_type: "t3.micro",
              ami_id: "ami-0c55b159cbfafe1d0",
              subnet_id: "public-subnet",
              security_group_ids: ["web-security-group"],
              associate_public_ip_address: true,
              root_block_device: {
                volume_type: "gp3",
                volume_size: 8,
                delete_on_termination: true,
                encrypted: false
              },
              ebs_block_devices: [],
              tags: {
                Name: "public-instance",
                Environment: "development"
              }
            }
          ]
        },
        storage: {
          s3_buckets: []
        },
        security: {
          security_groups: [
            {
              id: "web-security-group",
              name: "web-sg",
              description: "Security group for web servers",
              vpc_id: "main-vpc",
              ingress_rules: [
                {
                  from_port: 80,
                  to_port: 80,
                  protocol: "tcp",
                  cidr_blocks: ["0.0.0.0/0"],
                  description: "HTTP access"
                },
                {
                  from_port: 443,
                  to_port: 443,
                  protocol: "tcp",
                  cidr_blocks: ["0.0.0.0/0"],
                  description: "HTTPS access"
                },
                {
                  from_port: 22,
                  to_port: 22,
                  protocol: "tcp",
                  cidr_blocks: ["10.0.0.0/16"],
                  description: "SSH access from VPC"
                }
              ],
              egress_rules: [
                {
                  from_port: 0,
                  to_port: 0,
                  protocol: "-1",
                  cidr_blocks: ["0.0.0.0/0"],
                  description: "All outbound traffic"
                }
              ],
              tags: {
                Name: "web-security-group"
              }
            }
          ]
        }
      },
      deployment: {
        terraform: {
          version: "~> 1.0",
          required_providers: {
            aws: {
              source: "hashicorp/aws",
              version: "~> 5.0"
            }
          }
        },
        dependencies: [
          {
            source: "main-vpc",
            target: "private-subnet",
            type: "explicit",
            relationship: "contains"
          },
          {
            source: "main-vpc",
            target: "public-subnet",
            type: "explicit",
            relationship: "contains"
          },
          {
            source: "main-vpc",
            target: "web-security-group",
            type: "explicit",
            relationship: "contains"
          },
          {
            source: "private-subnet",
            target: "private-ec2",
            type: "explicit",
            relationship: "contains"
          },
          {
            source: "public-subnet",
            target: "public-ec2",
            type: "explicit",
            relationship: "contains"
          },
          {
            source: "web-security-group",
            target: "private-ec2",
            type: "explicit",
            relationship: "secures"
          },
          {
            source: "web-security-group",
            target: "public-ec2",
            type: "explicit",
            relationship: "secures"
          }
        ],
        strategy: {
          type: "single",
          rollback_on_failure: true,
          timeout: 3600
        }
      }
    };
  }
}
