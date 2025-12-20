import { GeneratedModule } from '../models/TerraformModule.js';
import { ModuleDependency, ModuleMappingResult } from './ModuleMapperService.js';
import { ParsedArchitectureMetadata } from './ArchitectureParserService.js';
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
    metadata: ParsedArchitectureMetadata,
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
    metadata: ParsedArchitectureMetadata,
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
  private static generateLocalsBlock(metadata: ParsedArchitectureMetadata): string {
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

      console.log(`[MODULE_BLOCK] Processing variable ${key} for module ${module.name}:`, { originalValue: value, type: typeof value });

      // Resolve cross-module references for null values
      if (value === null) {
        resolvedValue = this.resolveCrossModuleReference(key, module, allModules, nodes);
        console.log(`[MODULE_BLOCK] Resolved null value for ${key}:`, resolvedValue);
      }
      // Resolve placeholders for cross-module references
      else if (typeof value === 'string' && value.startsWith('__MODULE_REF__')) {
        console.log(`[MODULE_BLOCK] Found placeholder for ${key}:`, value);
        resolvedValue = this.resolveCrossModuleReference(key, module, allModules, nodes);
        console.log(`[MODULE_BLOCK] Resolved placeholder for ${key}:`, resolvedValue);
        if (!resolvedValue) {
          logger.terraform(LogLevel.WARN, `Failed to resolve placeholder for ${key} in module ${module.name}`, {
            variableName: key,
            moduleName: module.name,
            placeholder: value
          });
          console.log(`[MODULE_BLOCK] ❌ Failed to resolve ${key}, setting to null`);
          resolvedValue = null;
        }
      }
      // Resolve array placeholders for security groups
      else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && value[0].startsWith('__MODULE_REF__')) {
        resolvedValue = this.resolveCrossModuleReference(key, module, allModules, nodes);
        if (!resolvedValue || (Array.isArray(resolvedValue) && resolvedValue.length === 0)) {
          logger.terraform(LogLevel.WARN, `Failed to resolve placeholder array for ${key} in module ${module.name}`, {
            variableName: key,
            moduleName: module.name,
            placeholder: value
          });
          resolvedValue = [];
        }
      }
      // Resolve map/object placeholders for routes and associations
      else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        resolvedValue = this.resolveMapPlaceholders(value, module, allModules, nodes);
      }

      // Skip variables that couldn't be resolved (null values)
      // For required variables like vpc_id, subnet_id, this will cause Terraform to fail
      // with a clear error message about the missing variable
      if (resolvedValue === null || resolvedValue === undefined) {
        console.log(`[MODULE_BLOCK] ⚠️  Skipping variable ${key} - value is null/undefined`);
        logger.terraform(LogLevel.ERROR, `Skipping variable ${key} for module ${module.name} - value could not be resolved`, {
          variableName: key,
          moduleName: module.name,
          originalValue: value
        });
        continue; // Skip this variable entirely
      }

      const formattedValue = this.formatTerraformValue(resolvedValue);
      console.log(`[MODULE_BLOCK] Adding variable ${key} = ${formattedValue}`);
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
   * Resolve cross-module references for variables with null values or placeholders
   */
  private static resolveCrossModuleReference(
    variableName: string,
    currentModule: GeneratedModule,
    allModules: GeneratedModule[],
    nodes: any[]
  ): string | string[] | null {
    console.log(`[RESOLVE_REF] Resolving ${variableName} for module ${currentModule.name}`);
    console.log(`[RESOLVE_REF] Total nodes available:`, nodes.length);
    console.log(`[RESOLVE_REF] Node IDs:`, nodes.map(n => `${n.id} (${n.resourceType})`));
    
    // Find the current node that corresponds to this module
    const currentNode = nodes.find(node => {
      const moduleName = this.generateModuleName(node);
      return moduleName === currentModule.name;
    });

    if (!currentNode) {
      console.log(`[RESOLVE_REF] ❌ Current node not found for module ${currentModule.name}`);
      logger.terraform(LogLevel.WARN, `Cannot resolve ${variableName}: current node not found for module ${currentModule.name}`, {
        variableName,
        moduleName: currentModule.name
      });
      return null;
    }

    switch (variableName) {
      case 'vpc_id':
        console.log('[VPC_RESOLUTION] Resolving vpc_id for module:', currentModule.name);
        console.log('[VPC_RESOLUTION] Current node:', {
          id: currentNode.id,
          resourceType: currentNode.resourceType,
          parentId: currentNode.parentId,
          config_vpc_id: currentNode.configuration?.vpc_id
        });
        
        // Find the VPC this resource belongs to
        const vpcNode = this.findVpcForNode(currentNode, nodes);
        if (vpcNode) {
          const vpcModuleName = this.generateModuleName(vpcNode);
          console.log('[VPC_RESOLUTION] ✓ Found VPC via hierarchy:', vpcModuleName);
          logger.terraform(LogLevel.DEBUG, `Resolved vpc_id for ${currentModule.name} to ${vpcModuleName}`, {
            variableName,
            moduleName: currentModule.name,
            resolvedTo: vpcModuleName
          });
          return `module.${vpcModuleName}.vpc_id`;
        }
        
        console.log('[VPC_RESOLUTION] No VPC found via hierarchy, trying config reference');
        // If no VPC found in hierarchy, try to find by ID from configuration
        const vpcId = currentNode.configuration?.vpc_id || currentNode.configuration?.awsVpcId;
        console.log('[VPC_RESOLUTION] VPC ID from config:', vpcId);
        
        if (vpcId && typeof vpcId === 'string') {
          console.log('[VPC_RESOLUTION] Searching for node with ID:', vpcId);
          console.log('[VPC_RESOLUTION] Available node IDs:', nodes.map(n => n.id));
          
          const vpcNodeById = nodes.find(n => n.id === vpcId);
          if (vpcNodeById) {
            const vpcModuleName = this.generateModuleName(vpcNodeById);
            console.log('[VPC_RESOLUTION] ✓ Found VPC by ID:', vpcModuleName);
            logger.terraform(LogLevel.DEBUG, `Resolved vpc_id by ID for ${currentModule.name} to ${vpcModuleName}`, {
              variableName,
              moduleName: currentModule.name,
              resolvedTo: vpcModuleName
            });
            return `module.${vpcModuleName}.vpc_id`;
          } else {
            console.log('[VPC_RESOLUTION] ❌ No node found with ID:', vpcId);
          }
        }
        
        // Fallback: search for any VPC in the architecture
        console.log('[VPC_RESOLUTION] Trying fallback - searching for any VPC');
        console.log('[VPC_RESOLUTION] Node resource types:', nodes.map(n => n.resourceType));
        
        const anyVpc = nodes.find(n => n.resourceType === 'aws-vpc' || n.resourceType === 'vpc');
        if (anyVpc) {
          const vpcModuleName = this.generateModuleName(anyVpc);
          console.log('[VPC_RESOLUTION] ⚠️  Using fallback VPC:', vpcModuleName);
          logger.terraform(LogLevel.WARN, `Using fallback VPC for ${currentModule.name}: ${vpcModuleName}`, {
            variableName,
            moduleName: currentModule.name,
            resolvedTo: vpcModuleName,
            fallback: true
          });
          return `module.${vpcModuleName}.vpc_id`;
        }
        
        console.log('[VPC_RESOLUTION] ❌ FAILED to resolve vpc_id - no VPC found anywhere');
        logger.terraform(LogLevel.ERROR, `Failed to resolve vpc_id for ${currentModule.name}`, {
          variableName,
          moduleName: currentModule.name,
          nodeId: currentNode.id
        });
        break;

      case 'internet_gateway_id':
        // Find the internet gateway - check configuration first, then look for IGW in nodes
        const igwId = currentNode.configuration?.internet_gateway_id
          || currentNode.configuration?.awsInternetGatewayId;
        if (igwId && typeof igwId === 'string') {
          const igwNode = nodes.find(n => n.id === igwId);
          if (igwNode) {
            const igwModuleName = this.generateModuleName(igwNode);
            logger.terraform(LogLevel.DEBUG, `Resolved internet_gateway_id for ${currentModule.name} to ${igwModuleName}`, {
              variableName,
              moduleName: currentModule.name,
              resolvedTo: igwModuleName
            });
            return `module.${igwModuleName}.internet_gateway_id`;
          }
        }
        // For public subnets, find the VPC's internet gateway
        if (currentNode.resourceType === 'aws-public-subnet' || currentNode.resourceType === 'subnet') {
          const vpcNode = this.findVpcForNode(currentNode, nodes);
          if (vpcNode) {
            // Find IGW attached to this VPC
            const igwNode = nodes.find(n =>
              (n.resourceType === 'aws-internet-gateway' || n.resourceType === 'internet-gateway') &&
              (n.configuration?.awsVpcId === vpcNode.id || n.configuration?.vpc_id === vpcNode.id)
            );
            if (igwNode) {
              const igwModuleName = this.generateModuleName(igwNode);
              logger.terraform(LogLevel.DEBUG, `Resolved internet_gateway_id via VPC for ${currentModule.name} to ${igwModuleName}`, {
                variableName,
                moduleName: currentModule.name,
                resolvedTo: igwModuleName
              });
              return `module.${igwModuleName}.internet_gateway_id`;
            }
          }
        }
        // Fallback: search for any internet gateway in the architecture
        const anyIgw = nodes.find(n => n.resourceType === 'aws-internet-gateway' || n.resourceType === 'internet-gateway');
        if (anyIgw) {
          const igwModuleName = this.generateModuleName(anyIgw);
          logger.terraform(LogLevel.WARN, `Using fallback IGW for ${currentModule.name}: ${igwModuleName}`, {
            variableName,
            moduleName: currentModule.name,
            resolvedTo: igwModuleName,
            fallback: true
          });
          return `module.${igwModuleName}.internet_gateway_id`;
        }
        logger.terraform(LogLevel.WARN, `No internet_gateway_id found for ${currentModule.name}`, {
          variableName,
          moduleName: currentModule.name,
          nodeId: currentNode.id
        });
        break;

      case 'nat_gateway_id':
        // Find the NAT gateway - check configuration first
        const natId = currentNode.configuration?.nat_gateway_id
          || currentNode.configuration?.awsNatGatewayId;
        if (natId && typeof natId === 'string') {
          const natNode = nodes.find(n => n.id === natId);
          if (natNode) {
            const natModuleName = this.generateModuleName(natNode);
            logger.terraform(LogLevel.DEBUG, `Resolved nat_gateway_id for ${currentModule.name} to ${natModuleName}`, {
              variableName,
              moduleName: currentModule.name,
              resolvedTo: natModuleName
            });
            return `module.${natModuleName}.nat_gateway_id`;
          }
        }
        // For private subnets with enableNatGateway flag, find NAT Gateway in same VPC
        if (currentNode.resourceType === 'aws-private-subnet' ||
            (currentNode.resourceType === 'subnet' && currentNode.configuration?.enableNatGateway)) {
          const vpcNode = this.findVpcForNode(currentNode, nodes);
          if (vpcNode) {
            // Find NAT Gateway attached to this VPC
            const natNode = nodes.find(n =>
              (n.resourceType === 'aws-nat-gateway' || n.resourceType === 'nat-gateway') &&
              this.findVpcForNode(n, nodes)?.id === vpcNode.id
            );
            if (natNode) {
              const natModuleName = this.generateModuleName(natNode);
              logger.terraform(LogLevel.DEBUG, `Resolved nat_gateway_id via VPC for ${currentModule.name} to ${natModuleName}`, {
                variableName,
                moduleName: currentModule.name,
                resolvedTo: natModuleName
              });
              return `module.${natModuleName}.nat_gateway_id`;
            }
          }
        }
        // Fallback: search for any NAT gateway in the architecture
        const anyNat = nodes.find(n => n.resourceType === 'aws-nat-gateway' || n.resourceType === 'nat-gateway');
        if (anyNat) {
          const natModuleName = this.generateModuleName(anyNat);
          logger.terraform(LogLevel.WARN, `Using fallback NAT Gateway for ${currentModule.name}: ${natModuleName}`, {
            variableName,
            moduleName: currentModule.name,
            resolvedTo: natModuleName,
            fallback: true
          });
          return `module.${natModuleName}.nat_gateway_id`;
        }
        logger.terraform(LogLevel.WARN, `No nat_gateway_id found for ${currentModule.name}`, {
          variableName,
          moduleName: currentModule.name,
          nodeId: currentNode.id
        });
        break;

      case 'subnet_id':
        // Find the subnet - check configuration first
        const subnetId = currentNode.configuration?.subnet_id
          || currentNode.configuration?.subnetId
          || currentNode.configuration?.awsSubnetId
          || currentNode.parentId;
        if (subnetId && typeof subnetId === 'string') {
          const subnetNode = nodes.find(n => n.id === subnetId);
          if (subnetNode) {
            const subnetModuleName = this.generateModuleName(subnetNode);
            logger.terraform(LogLevel.DEBUG, `Resolved subnet_id for ${currentModule.name} to ${subnetModuleName}`, {
              variableName,
              moduleName: currentModule.name,
              resolvedTo: subnetModuleName
            });
            return `module.${subnetModuleName}.subnet_id`;
          }
        }
        // Fallback: search for subnet by parent hierarchy
        let parentNode = currentNode.parentId ? nodes.find(n => n.id === currentNode.parentId) : null;
        while (parentNode) {
          if (parentNode.resourceType === 'aws-public-subnet' || parentNode.resourceType === 'aws-private-subnet' || parentNode.resourceType === 'subnet') {
            const subnetModuleName = this.generateModuleName(parentNode);
            logger.terraform(LogLevel.DEBUG, `Resolved subnet_id via parent hierarchy for ${currentModule.name} to ${subnetModuleName}`, {
              variableName,
              moduleName: currentModule.name,
              resolvedTo: subnetModuleName
            });
            return `module.${subnetModuleName}.subnet_id`;
          }
          parentNode = parentNode.parentId ? nodes.find(n => n.id === parentNode.parentId) : null;
        }
        // Fallback: search for any subnet in the architecture
        const anySubnet = nodes.find(n =>
          n.resourceType === 'aws-public-subnet' ||
          n.resourceType === 'aws-private-subnet' ||
          n.resourceType === 'subnet'
        );
        if (anySubnet) {
          const subnetModuleName = this.generateModuleName(anySubnet);
          logger.terraform(LogLevel.WARN, `Using fallback subnet for ${currentModule.name}: ${subnetModuleName}`, {
            variableName,
            moduleName: currentModule.name,
            resolvedTo: subnetModuleName,
            fallback: true
          });
          return `module.${subnetModuleName}.subnet_id`;
        }
        logger.terraform(LogLevel.ERROR, `Failed to resolve subnet_id for ${currentModule.name}`, {
          variableName,
          moduleName: currentModule.name,
          nodeId: currentNode.id
        });
        break;

      case 'security_group_ids':
        // Find security groups - configuration can be array of IDs or single ID
        const sgIds = currentNode.configuration?.security_group_ids
          || currentNode.configuration?.securityGroups
          || currentNode.configuration?.awsSecurityGroupIds
          || [];

        if (Array.isArray(sgIds) && sgIds.length > 0) {
          // Map each security group ID to a module reference
          const resolvedSgIds = sgIds
            .map((sgId: string) => {
              const sgNode = nodes.find(n => n.id === sgId);
              if (sgNode) {
                const sgModuleName = this.generateModuleName(sgNode);
                return `module.${sgModuleName}.security_group_id`;
              }
              return null;
            })
            .filter((ref): ref is string => ref !== null);

          if (resolvedSgIds.length > 0) {
            logger.terraform(LogLevel.DEBUG, `Resolved ${resolvedSgIds.length} security group(s) for ${currentModule.name}`, {
              variableName,
              moduleName: currentModule.name,
              count: resolvedSgIds.length
            });
            // Return as array for Terraform
            return resolvedSgIds;
          }
        }
        // Check if there are any security groups defined in the dependencies
        const allSgNodes = nodes.filter(n =>
          n.resourceType === 'aws-security-group' ||
          n.resourceType === 'security-group'
        );
        if (allSgNodes.length > 0 && currentNode.dependencies.length > 0) {
          // Find security groups that are in the dependencies
          const depSgIds = currentNode.dependencies
            .map((depId: string) => {
              const depNode = nodes.find(n => n.id === depId);
              if (depNode && (depNode.resourceType === 'aws-security-group' || depNode.resourceType === 'security-group')) {
                const sgModuleName = this.generateModuleName(depNode);
                return `module.${sgModuleName}.security_group_id`;
              }
              return null;
            })
            .filter((ref: string | null): ref is string => ref !== null);

          if (depSgIds.length > 0) {
            logger.terraform(LogLevel.DEBUG, `Resolved ${depSgIds.length} security group(s) from dependencies for ${currentModule.name}`, {
              variableName,
              moduleName: currentModule.name,
              count: depSgIds.length
            });
            return depSgIds;
          }
        }
        logger.terraform(LogLevel.DEBUG, `No security groups found for ${currentModule.name}, returning empty array`, {
          variableName,
          moduleName: currentModule.name
        });
        // Return empty array if no security groups found
        return [] as string[];

      case 'nat_gateway_id':
        // Find NAT gateway if specified in configuration
        const natGwId = currentNode.configuration?.nat_gateway_id
          || currentNode.configuration?.awsNatGatewayId;
        if (natGwId && typeof natGwId === 'string') {
          const natGwNode = nodes.find(n => n.id === natGwId);
          if (natGwNode) {
            const natGwModuleName = this.generateModuleName(natGwNode);
            logger.terraform(LogLevel.DEBUG, `Resolved nat_gateway_id for ${currentModule.name} to ${natGwModuleName}`, {
              variableName,
              moduleName: currentModule.name,
              resolvedTo: natGwModuleName
            });
            return `module.${natGwModuleName}.nat_gateway_id`;
          }
        }
        // For private subnets with enableNatGateway flag, find NAT gateway
        if (currentNode.resourceType === 'aws-private-subnet' && currentNode.configuration?.enableNatGateway) {
          const vpcNode = this.findVpcForNode(currentNode, nodes);
          if (vpcNode) {
            // Find NAT gateway attached to this VPC
            const natGwNode = nodes.find(n =>
              (n.resourceType === 'aws-nat-gateway' || n.resourceType === 'nat-gateway') &&
              (n.configuration?.awsVpcId === vpcNode.id || n.configuration?.vpc_id === vpcNode.id)
            );
            if (natGwNode) {
              const natGwModuleName = this.generateModuleName(natGwNode);
              logger.terraform(LogLevel.DEBUG, `Resolved nat_gateway_id via VPC for ${currentModule.name} to ${natGwModuleName}`, {
                variableName,
                moduleName: currentModule.name,
                resolvedTo: natGwModuleName
              });
              return `module.${natGwModuleName}.nat_gateway_id`;
            }
          }
        }
        // Fallback: search for any NAT gateway in the architecture
        const anyNatGw = nodes.find(n => n.resourceType === 'aws-nat-gateway' || n.resourceType === 'nat-gateway');
        if (anyNatGw && currentNode.resourceType === 'aws-private-subnet') {
          const natGwModuleName = this.generateModuleName(anyNatGw);
          logger.terraform(LogLevel.WARN, `Using fallback NAT Gateway for ${currentModule.name}: ${natGwModuleName}`, {
            variableName,
            moduleName: currentModule.name,
            resolvedTo: natGwModuleName,
            fallback: true
          });
          return `module.${natGwModuleName}.nat_gateway_id`;
        }
        logger.terraform(LogLevel.DEBUG, `No nat_gateway_id found for ${currentModule.name}`, {
          variableName,
          moduleName: currentModule.name
        });
        return null;

      default:
        logger.terraform(LogLevel.WARN, `Unknown variable name for cross-module resolution: ${variableName}`, {
          variableName,
          moduleName: currentModule.name
        });
        return null;
    }

    return null;
  }

  /**
   * Recursively resolve __MODULE_REF__ placeholders within map/object structures
   * Used for routes and associations in route-table modules
   */
  private static resolveMapPlaceholders(
    mapValue: Record<string, any>,
    currentModule: GeneratedModule,
    allModules: GeneratedModule[],
    nodes: any[]
  ): Record<string, any> {
    const resolvedMap: Record<string, any> = {};

    for (const [key, value] of Object.entries(mapValue)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively resolve nested objects
        const resolvedNested: Record<string, any> = {};

        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (typeof nestedValue === 'string' && nestedValue.startsWith('__MODULE_REF__')) {
            // Extract the node ID and output name from the placeholder
            // Format: __MODULE_REF__<node-id>__<output-name>
            const match = nestedValue.match(/^__MODULE_REF__(.+)__(.+)$/);
            if (match) {
              const [, nodeId, outputName] = match;
              const targetNode = nodes.find(n => n.id === nodeId);

              if (targetNode) {
                const targetModuleName = this.generateModuleName(targetNode);
                resolvedNested[nestedKey] = `module.${targetModuleName}.${outputName}`;
                logger.terraform(LogLevel.DEBUG, `Resolved map placeholder in ${currentModule.name}.${key}.${nestedKey}`, {
                  moduleName: currentModule.name,
                  mapKey: key,
                  nestedKey,
                  nodeId,
                  outputName,
                  resolvedTo: `module.${targetModuleName}.${outputName}`
                });
              } else {
                logger.terraform(LogLevel.WARN, `Failed to resolve map placeholder: node ${nodeId} not found`, {
                  moduleName: currentModule.name,
                  mapKey: key,
                  nestedKey,
                  nodeId,
                  placeholder: nestedValue
                });
                resolvedNested[nestedKey] = nestedValue;
              }
            } else {
              logger.terraform(LogLevel.WARN, `Invalid placeholder format in map: ${nestedValue}`, {
                moduleName: currentModule.name,
                mapKey: key,
                nestedKey,
                placeholder: nestedValue
              });
              resolvedNested[nestedKey] = nestedValue;
            }
          } else {
            // Keep non-placeholder values as-is
            resolvedNested[nestedKey] = nestedValue;
          }
        }

        resolvedMap[key] = resolvedNested;
      } else {
        // Keep non-object values as-is
        resolvedMap[key] = value;
      }
    }

    return resolvedMap;
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
    metadata: ParsedArchitectureMetadata
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
    metadata: ParsedArchitectureMetadata
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
  private static generateProvidersVersionsTf(metadata: ParsedArchitectureMetadata): string {
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
