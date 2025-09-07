import { ArchitectureData, ArchitectureNode } from '../models/Architecture.js';

export class TerraformConfigService {
  /**
   * Convert ArchitectureData to TerraformGenerator compatible format
   */
  static convertArchitectureDataToTerraformConfig(architectureData: ArchitectureData): any {
    console.log('🔄 Converting ArchitectureData to Terraform config...');

    const config: any = {
      provider: {},
      resources: {},
      variables: architectureData.variables || {},
      outputs: architectureData.outputs || {}
    };

    // Set provider based on metadata
    const provider = architectureData.metadata.provider || 'aws';
    config.provider[provider] = {
      region: "us-east-1", // Default region
      version: "~> 5.0"
    };

    // Convert nodes to resources
    architectureData.nodes.forEach(node => {
      try {
        // Map resourceType to Terraform resource type
        const terraformResourceType = this.mapResourceTypeToTerraform(node.resourceType);

        // Create resource name from node name (sanitize for Terraform)
        const resourceName = this.sanitizeResourceName(node.name || node.id);

        console.log(`📦 Converting node ${node.id} (${node.resourceType}) to ${terraformResourceType}.${resourceName}`);

        // Initialize resource type group if it doesn't exist
        if (!config.resources[terraformResourceType]) {
          config.resources[terraformResourceType] = {};
        }

        // Convert node configuration to Terraform resource configuration
        const resourceConfig = this.convertNodeConfigurationToTerraform(node, terraformResourceType);

        config.resources[terraformResourceType][resourceName] = resourceConfig;

      } catch (error) {
        console.warn(`⚠️ Failed to convert node ${node.id}:`, error);
        // Continue with other nodes even if one fails
      }
    });

    // Add data sources for common AWS resources
    config.data = {
      aws_vpc: {
        default: {
          default: true
        }
      },
      aws_subnets: {
        default: {
          filter: [
            {
              name: "vpc-id",
              values: ["data.aws_vpc.default.id"]
            }
          ]
        }
      }
    };

    console.log('✅ Conversion complete. Generated config:', JSON.stringify(config, null, 2));
    return config;
  }

  /**
   * Map frontend resource types to Terraform resource types
   */
  private static mapResourceTypeToTerraform(resourceType: string): string {
    const mapping: Record<string, string> = {
      'ec2': 'aws_instance',
      'aws-ec2': 'aws_instance',
      'instance': 'aws_instance',
      'vpc': 'aws_vpc',
      'aws-vpc': 'aws_vpc',
      'subnet': 'aws_subnet',
      'aws-subnet': 'aws_subnet',
      's3': 'aws_s3_bucket',
      'aws-s3': 'aws_s3_bucket',
      'bucket': 'aws_s3_bucket',
      'rds': 'aws_db_instance',
      'aws-rds': 'aws_db_instance',
      'database': 'aws_db_instance',
      'lambda': 'aws_lambda_function',
      'aws-lambda': 'aws_lambda_function',
      'function': 'aws_lambda_function',
      'alb': 'aws_lb',
      'aws-alb': 'aws_lb',
      'load-balancer': 'aws_lb',
      'elb': 'aws_lb',
      'security-group': 'aws_security_group',
      'aws-security-group': 'aws_security_group',
      'sg': 'aws_security_group',
      'iam-role': 'aws_iam_role',
      'aws-iam-role': 'aws_iam_role',
      'role': 'aws_iam_role'
    };

    const terraformType = mapping[resourceType.toLowerCase()] || 'aws_instance';
    console.log(`🔀 Mapped ${resourceType} -> ${terraformType}`);
    return terraformType;
  }

  /**
   * Sanitize resource name for Terraform (alphanumeric and underscore only)
   */
  private static sanitizeResourceName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '') || 'resource';
  }

  /**
   * Convert node configuration to Terraform resource configuration
   */
  private static convertNodeConfigurationToTerraform(node: ArchitectureNode, terraformResourceType: string): any {
    const baseConfig = { ...node.configuration };

    // Add default tags
    if (!baseConfig.tags) {
      baseConfig.tags = {};
    }

    baseConfig.tags = {
      ...baseConfig.tags,
      Name: node.name || node.id,
      ManagedBy: "Darch",
      CreatedAt: new Date().toISOString()
    };

    // Add resource-specific defaults based on type
    switch (terraformResourceType) {
      case 'aws_instance':
        return {
          ami: baseConfig.ami || "ami-0c02fb55956c7d316", // Default Amazon Linux 2 AMI
          instance_type: baseConfig.instance_type || "t2.micro",
          subnet_id: baseConfig.subnet_id || "data.aws_subnets.default.ids[0]",
          vpc_security_group_ids: baseConfig.vpc_security_group_ids || ["data.aws_security_group.default.id"],
          tags: baseConfig.tags,
          ...baseConfig
        };

      case 'aws_vpc':
        return {
          cidr_block: baseConfig.cidr_block || "10.0.0.0/16",
          enable_dns_hostnames: baseConfig.enable_dns_hostnames ?? true,
          enable_dns_support: baseConfig.enable_dns_support ?? true,
          tags: baseConfig.tags,
          ...baseConfig
        };

      case 'aws_subnet':
        return {
          vpc_id: baseConfig.vpc_id || "data.aws_vpc.default.id",
          cidr_block: baseConfig.cidr_block || "10.0.1.0/24",
          availability_zone: baseConfig.availability_zone || "us-east-1a",
          map_public_ip_on_launch: baseConfig.map_public_ip_on_launch ?? true,
          tags: baseConfig.tags,
          ...baseConfig
        };

      case 'aws_s3_bucket':
        return {
          bucket: baseConfig.bucket || `darch-bucket-${Math.random().toString(36).substr(2, 9)}`,
          tags: baseConfig.tags,
          ...baseConfig
        };

      case 'aws_security_group':
        return {
          name: baseConfig.name || `${this.sanitizeResourceName(node.name)}-sg`,
          description: baseConfig.description || `Security group for ${node.name}`,
          vpc_id: baseConfig.vpc_id || "data.aws_vpc.default.id",
          ingress: baseConfig.ingress || [
            {
              from_port: 80,
              to_port: 80,
              protocol: "tcp",
              cidr_blocks: ["0.0.0.0/0"]
            }
          ],
          egress: baseConfig.egress || [
            {
              from_port: 0,
              to_port: 0,
              protocol: "-1",
              cidr_blocks: ["0.0.0.0/0"]
            }
          ],
          tags: baseConfig.tags,
          ...baseConfig
        };

      default:
        return {
          tags: baseConfig.tags,
          ...baseConfig
        };
    }
  }
}
