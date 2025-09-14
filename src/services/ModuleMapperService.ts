import { ParsedNode, ParsedArchitecture, ArchitectureMetadata } from './ArchitectureParserService.js';
import { ModuleRegistryService } from './ModuleRegistryService.js';
import { TerraformModule, ModuleConfiguration, GeneratedModule } from '../models/TerraformModule.js';
import { logger, LogCategory, LogLevel } from '../utils/Logger.js';

export interface ModuleMappingResult {
  modules: GeneratedModule[];
  dependencies: ModuleDependency[];
  errors: string[];
  warnings: string[];
  nodes: ParsedNode[]; // Add original nodes for cross-reference resolution
}

export interface ModuleDependency {
  moduleId: string;
  dependsOn: string[];
  level: number;
}

export interface ResourceMapping {
  nodeId: string;
  modulePath: string;
  moduleInstance: string;
  variables: Record<string, any>;
  dependencies: string[];
}

export class ModuleMapperService {

  /**
   * Map parsed architecture to Terraform modules
   */
  static async mapArchitectureToModules(
    parsedArchitecture: ParsedArchitecture
  ): Promise<ModuleMappingResult> {
    const startTime = Date.now();

    logger.module(LogLevel.INFO, '🔄 Mapping architecture to Terraform modules', {
      nodesCount: parsedArchitecture.nodes.length,
      connectionsCount: parsedArchitecture.connections.length,
      provider: parsedArchitecture.metadata.provider,
      component: 'ModuleMapperService',
      operation: 'mapArchitectureToModules'
    });

    const errors: string[] = [];
    const warnings: string[] = [];
    const modules: GeneratedModule[] = [];
    const dependencies: ModuleDependency[] = [];

    try {
      // Sort nodes by dependency order (topological sort)
      const sortedNodes = this.topologicalSort(parsedArchitecture.nodes);

      // Map each node to a module
      for (const node of sortedNodes) {
        try {
          const moduleResult = await this.mapNodeToModule(node, parsedArchitecture.metadata, sortedNodes);
          if (moduleResult) {
            modules.push(moduleResult);
          }
        } catch (error) {
          const errorMessage = `Failed to map node ${node.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);

          logger.error('❌ Failed to map node to module', {
            nodeId: node.id,
            resourceType: node.resourceType,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            category: LogCategory.MODULE,
            component: 'ModuleMapperService'
          });
        }
      }

      // Build dependency graph for modules
      const dependencyGraph = this.buildModuleDependencies(modules, sortedNodes);
      dependencies.push(...dependencyGraph);

      const duration = Date.now() - startTime;

      logger.module(LogLevel.INFO, '✅ Successfully mapped architecture to modules', {
        modulesCount: modules.length,
        errorsCount: errors.length,
        warningsCount: warnings.length,
        dependenciesCount: dependencies.length,
        duration,
        component: 'ModuleMapperService'
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = `Failed to map architecture: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMessage);

      logger.error('❌ Failed to map architecture', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        nodesCount: parsedArchitecture.nodes.length,
        duration,
        category: LogCategory.MODULE,
        component: 'ModuleMapperService'
      });
    }

    return {
      modules,
      dependencies,
      errors,
      warnings,
      nodes: parsedArchitecture.nodes
    };
  }

  /**
   * Map a single node to a Terraform module
   */
  private static async mapNodeToModule(
    node: ParsedNode,
    metadata: ArchitectureMetadata,
    allNodes?: ParsedNode[]
  ): Promise<GeneratedModule | null> {
    const [category, moduleName] = node.terraformModule.split('/');

    // Get module definition from registry
    const moduleDefinition = await ModuleRegistryService.getModule(category, moduleName);
    if (!moduleDefinition) {
      throw new Error(`Module ${node.terraformModule} not found in registry`);
    }

    // Generate unique module instance name
    const moduleInstanceName = this.generateModuleInstanceName(node);

    // Map node configuration to module variables
    const variables = await this.mapConfigurationToVariables(
      node,
      moduleDefinition,
      metadata,
      allNodes
    );

    // Create module source path - use relative path from generated directory back to source
    const modulePath = `../../../../data/terraform-modules/${category}/${moduleName}`;

    return {
      name: moduleInstanceName,
      source: modulePath,
      variables,
      outputs: this.generateModuleOutputs(moduleDefinition, moduleInstanceName)
    };
  }

  /**
   * Generate unique module instance name
   */
  private static generateModuleInstanceName(node: ParsedNode): string {
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
   * Map node configuration to module variables
   */
  private static async mapConfigurationToVariables(
    node: ParsedNode,
    moduleDefinition: TerraformModule,
    metadata: ArchitectureMetadata,
    allNodes?: ParsedNode[]
  ): Promise<Record<string, any>> {
    const variables: Record<string, any> = {};

    // Set module-specific variables based on node configuration
    for (const moduleVar of moduleDefinition.variables) {
      const value = this.mapVariableValue(node, moduleVar, metadata, allNodes);
      if (value !== undefined) {
        variables[moduleVar.name] = value;
      }
    }

    // Add common variables
    variables.tags = {
      ...metadata.tags,
      Name: node.name,
      ResourceType: node.resourceType,
      NodeId: node.id,
      ...node.configuration.tags
    };

    return variables;
  }

  /**
   * Map individual variable value
   */
  private static mapVariableValue(
    node: ParsedNode,
    moduleVar: any,
    metadata: ArchitectureMetadata,
    allNodes?: ParsedNode[]
  ): any {
    const { name: varName } = moduleVar;
    const config = node.configuration;

    // Direct mapping from configuration
    if (config[varName] !== undefined) {
      return config[varName];
    }

    // Common variable mappings
    switch (varName) {
      case 'name':
        return node.name;

      case 'region':
        return metadata.region;

      case 'availability_zone':
        return config.availability_zone || `${metadata.region}a`;

      case 'cidr_block':
        return config.cidr_block || this.generateDefaultCidr(node);

      case 'vpc_id':
        // Will be resolved in main.tf module call, not as variable default
        return null;

      case 'subnet_id':
        // Will be resolved in main.tf module call, not as variable default
        return null;

      case 'security_group_ids':
        // This will be resolved at module call time, not as a variable default
        return [];

      case 'instance_type':
        return config.instance_type || 't3.micro';

      case 'bucket_name':
        return config.bucket_name || this.generateUniqueBucketName(node.name);

      case 'subnet_type':
        return this.inferSubnetType(node);

      case 'map_public_ip_on_launch':
        return this.inferSubnetType(node) === 'public';

      case 'internet_gateway_id':
        // Will be resolved in main.tf module call, not as variable default
        return null;

      case 'nat_gateway_id':
        // This will be resolved at module call time, not as a variable default
        return null;

      default:
        return moduleVar.default;
    }
  }

  /**
   * Generate default CIDR block for networking resources
   */
  private static generateDefaultCidr(node: ParsedNode): string {
    const cidrMap: Record<string, string> = {
      'networking/vpc': '10.0.0.0/16',
      'networking/subnet': '10.0.1.0/24'
    };

    return cidrMap[node.terraformModule] || '10.0.0.0/24';
  }

  /**
   * Generate resource reference for dependencies
   */
  private static generateResourceReference(
    node: ParsedNode,
    resourceType: string,
    outputName: string,
    allNodes?: ParsedNode[]
  ): string {
    if (!allNodes) {
      // Fallback to generic reference if no context available
      return `module.${resourceType}_instance.${outputName}`;
    }

    // Find the dependency node based on the resource type
    let dependencyNode: ParsedNode | undefined;

    if (resourceType === 'vpc') {
      // For subnets, find the VPC they belong to
      // Look for a VPC node that this subnet references
      const vpcId = node.configuration?.vpc_id || 
                   node.configuration?.awsVpcId || 
                   node.parentId;
                   
      if (vpcId) {
        dependencyNode = allNodes.find(n => 
          n.resourceType === 'aws-vpc' && 
          (n.id === vpcId || n.configuration?.awsVpcId === vpcId)
        );
      }
      
      // If still not found, look up the parent hierarchy
      if (!dependencyNode && node.parentId) {
        const parent = allNodes.find(n => n.id === node.parentId);
        if (parent?.resourceType === 'aws-vpc') {
          dependencyNode = parent;
        } else if (parent) {
          // Recursively look up the hierarchy
          let current = parent;
          while (current && current.parentId && !dependencyNode) {
            const grandParent = allNodes.find(n => n.id === current.parentId);
            if (grandParent?.resourceType === 'aws-vpc') {
              dependencyNode = grandParent;
              break;
            }
            if (grandParent) {
              current = grandParent;
            } else {
              break;
            }
          }
        }
      }
    } else if (resourceType === 'subnet') {
      // For EC2 instances, find the subnet they belong to
      const subnetId = node.configuration?.subnetId || node.parentId;
      if (subnetId) {
        dependencyNode = allNodes.find(n => 
          (n.resourceType === 'aws-public-subnet' || n.resourceType === 'aws-private-subnet') && 
          n.id === subnetId
        );
      }
    }

    if (dependencyNode) {
      const moduleInstanceName = this.generateModuleInstanceName(dependencyNode);
      return `module.${moduleInstanceName}.${outputName}`;
    }

    // Fallback to generic reference
    return `module.${resourceType}_instance.${outputName}`;
  }

  /**
   * Generate unique S3 bucket name
   */
  private static generateUniqueBucketName(baseName: string): string {
    const sanitized = baseName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const timestamp = Date.now().toString(36);
    return `${sanitized}-${timestamp}`;
  }

  /**
   * Infer subnet type from node configuration or naming
   */
  private static inferSubnetType(node: ParsedNode): string {
    const name = node.name.toLowerCase();
    const resourceType = node.resourceType.toLowerCase();

    if (name.includes('public') || resourceType.includes('public')) {
      return 'public';
    }
    if (name.includes('private') || resourceType.includes('private')) {
      return 'private';
    }
    if (name.includes('database') || name.includes('db')) {
      return 'database';
    }

    // Default to private for security
    return 'private';
  }

  /**
   * Generate module outputs mapping
   */
  private static generateModuleOutputs(
    moduleDefinition: TerraformModule,
    moduleInstanceName: string
  ): Record<string, string> {
    const outputs: Record<string, string> = {};

    for (const output of moduleDefinition.outputs) {
      outputs[output.name] = `module.${moduleInstanceName}.${output.name}`;
    }

    return outputs;
  }

  /**
   * Build module dependencies
   */
  private static buildModuleDependencies(
    modules: GeneratedModule[],
    nodes: ParsedNode[]
  ): ModuleDependency[] {
    const dependencies: ModuleDependency[] = [];
    const moduleMap = new Map(modules.map(m => [m.name, m]));
    const nodeToModule = new Map(
      nodes.map(node => [node.id, this.generateModuleInstanceName(node)])
    );

    for (const node of nodes) {
      const moduleId = nodeToModule.get(node.id);
      if (!moduleId) continue;

      const dependsOn = node.dependencies
        .map(depId => nodeToModule.get(depId))
        .filter(Boolean) as string[];

      dependencies.push({
        moduleId,
        dependsOn,
        level: this.calculateDependencyLevel(node, nodes)
      });
    }

    return dependencies;
  }

  /**
   * Calculate dependency level for ordering
   */
  private static calculateDependencyLevel(node: ParsedNode, allNodes: ParsedNode[]): number {
    const visited = new Set<string>();

    const calculateLevel = (nodeId: string): number => {
      if (visited.has(nodeId)) return 0; // Circular dependency protection
      visited.add(nodeId);

      const currentNode = allNodes.find(n => n.id === nodeId);
      if (!currentNode || currentNode.dependencies.length === 0) {
        return 0;
      }

      const maxDepLevel = Math.max(
        ...currentNode.dependencies.map(depId => calculateLevel(depId))
      );

      return maxDepLevel + 1;
    };

    return calculateLevel(node.id);
  }

  /**
   * Topological sort for dependency ordering
   */
  private static topologicalSort(nodes: ParsedNode[]): ParsedNode[] {
    const sorted: ParsedNode[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (nodeId: string): void => {
      if (visited.has(nodeId)) return;
      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected at node ${nodeId}`);
      }

      visiting.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        // Visit all dependencies first
        for (const depId of node.dependencies) {
          visit(depId);
        }

        visited.add(nodeId);
        visiting.delete(nodeId);
        sorted.push(node);
      }
    };

    // Start with nodes that have no dependencies
    const noDepsNodes = nodes.filter(n => n.dependencies.length === 0);
    for (const node of noDepsNodes) {
      visit(node.id);
    }

    // Then visit remaining nodes
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        visit(node.id);
      }
    }

    return sorted;
  }

  /**
   * Resolve module references in variables
   */
  static resolveModuleReferences(
    modules: GeneratedModule[],
    dependencies: ModuleDependency[]
  ): GeneratedModule[] {
    const moduleMap = new Map(modules.map(m => [m.name, m]));
    const dependencyMap = new Map(dependencies.map(d => [d.moduleId, d.dependsOn]));

    return modules.map(module => {
      const resolvedVariables: Record<string, any> = {};

      for (const [key, value] of Object.entries(module.variables)) {
        if (typeof value === 'string' && value.startsWith('module.')) {
          // Try to resolve the reference
          const resolved = this.resolveReference(value, moduleMap, dependencyMap);
          resolvedVariables[key] = resolved;
        } else {
          resolvedVariables[key] = value;
        }
      }

      return {
        ...module,
        variables: resolvedVariables
      };
    });
  }

  /**
   * Resolve a module reference
   */
  private static resolveReference(
    reference: string,
    moduleMap: Map<string, GeneratedModule>,
    dependencyMap: Map<string, string[]>
  ): string {
    // For now, return the reference as-is
    // In a full implementation, this would resolve to actual module outputs
    return reference;
  }
}
