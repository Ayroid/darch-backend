import fs from 'fs';
import path from 'path';
import { TerraformModule, ModuleMetadata, ModuleVariable, ModuleOutput } from '../models/TerraformModule.js';

export class ModuleRegistryService {
  private static modulesBasePath = path.resolve(process.cwd(), 'terraform-modules');
  private static moduleRegistry: Map<string, TerraformModule> = new Map();
  private static initialized = false;

  /**
   * Initialize the module registry by scanning the terraform-modules directory
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔄 Initializing Terraform Module Registry...');

    try {
      await this.scanModules();
      this.initialized = true;
      console.log(`✅ Module Registry initialized with ${this.moduleRegistry.size} modules`);
    } catch (error) {
      console.error('❌ Failed to initialize Module Registry:', error);
      throw error;
    }
  }

  /**
   * Scan the terraform-modules directory and register all modules
   */
  private static async scanModules(): Promise<void> {
    const categories = await this.getDirectories(this.modulesBasePath);

    for (const category of categories) {
      const categoryPath = path.join(this.modulesBasePath, category);
      const modules = await this.getDirectories(categoryPath);

      for (const moduleName of modules) {
        const modulePath = path.join(categoryPath, moduleName);
        try {
          const module = await this.parseModule(category, moduleName, modulePath);
          const moduleKey = `${category}/${moduleName}`;
          this.moduleRegistry.set(moduleKey, module);
          console.log(`📦 Registered module: ${moduleKey}`);
        } catch (error) {
          console.warn(`⚠️ Failed to parse module ${category}/${moduleName}:`, error);
        }
      }
    }
  }

  /**
   * Parse a Terraform module from its directory
   */
  private static async parseModule(category: string, name: string, modulePath: string): Promise<TerraformModule> {
    const mainTfPath = path.join(modulePath, 'main.tf');
    const variablesTfPath = path.join(modulePath, 'variables.tf');
    const outputsTfPath = path.join(modulePath, 'outputs.tf');

    // Check if required files exist
    if (!fs.existsSync(mainTfPath)) {
      throw new Error(`main.tf not found in ${modulePath}`);
    }

    const variables = fs.existsSync(variablesTfPath)
      ? await this.parseVariables(variablesTfPath)
      : [];

    const outputs = fs.existsSync(outputsTfPath)
      ? await this.parseOutputs(outputsTfPath)
      : [];

    return {
      name,
      category,
      path: modulePath,
      description: `${category} ${name} module`,
      version: '1.0.0',
      variables,
      outputs,
      dependencies: this.extractDependencies(category, name),
      tags: [category, name]
    };
  }

  /**
   * Parse variables from variables.tf file
   */
  private static async parseVariables(variablesPath: string): Promise<ModuleVariable[]> {
    const content = fs.readFileSync(variablesPath, 'utf-8');
    const variables: ModuleVariable[] = [];

    // Simple regex-based parsing for variable blocks
    const variableBlocks = content.match(/variable\s+"([^"]+)"\s*{[^}]*}/g) || [];

    for (const block of variableBlocks) {
      const nameMatch = block.match(/variable\s+"([^"]+)"/);
      const descriptionMatch = block.match(/description\s*=\s*"([^"]*)"/);
      const typeMatch = block.match(/type\s*=\s*([^\n]*)/);
      const defaultMatch = block.match(/default\s*=\s*([^\n]*)/);

      if (nameMatch) {
        variables.push({
          name: nameMatch[1],
          description: descriptionMatch ? descriptionMatch[1] : '',
          type: typeMatch ? typeMatch[1].trim() : 'string',
          default: defaultMatch ? this.parseDefaultValue(defaultMatch[1]) : undefined,
          required: !defaultMatch
        });
      }
    }

    return variables;
  }

  /**
   * Parse outputs from outputs.tf file
   */
  private static async parseOutputs(outputsPath: string): Promise<ModuleOutput[]> {
    const content = fs.readFileSync(outputsPath, 'utf-8');
    const outputs: ModuleOutput[] = [];

    // Simple regex-based parsing for output blocks
    const outputBlocks = content.match(/output\s+"([^"]+)"\s*{[^}]*}/g) || [];

    for (const block of outputBlocks) {
      const nameMatch = block.match(/output\s+"([^"]+)"/);
      const descriptionMatch = block.match(/description\s*=\s*"([^"]*)"/);
      const valueMatch = block.match(/value\s*=\s*([^\n]*)/);
      const sensitiveMatch = block.match(/sensitive\s*=\s*(true|false)/);

      if (nameMatch && valueMatch) {
        outputs.push({
          name: nameMatch[1],
          description: descriptionMatch ? descriptionMatch[1] : '',
          value: valueMatch[1].trim(),
          sensitive: sensitiveMatch ? sensitiveMatch[1] === 'true' : false
        });
      }
    }

    return outputs;
  }

  /**
   * Extract dependencies based on module type and category
   */
  private static extractDependencies(category: string, name: string): string[] {
    const dependencyMap: Record<string, string[]> = {
      'networking/subnet': ['networking/vpc'],
      'compute/ec2': ['networking/subnet', 'security/security-group'],
      'security/security-group': ['networking/vpc'],
      'storage/s3': [],
      'database/rds': ['networking/subnet', 'security/security-group']
    };

    return dependencyMap[`${category}/${name}`] || [];
  }

  /**
   * Parse default value from Terraform syntax
   */
  private static parseDefaultValue(defaultStr: string): any {
    defaultStr = defaultStr.trim();

    if (defaultStr === 'null') return null;
    if (defaultStr === 'true') return true;
    if (defaultStr === 'false') return false;
    if (defaultStr.match(/^\d+$/)) return parseInt(defaultStr);
    if (defaultStr.match(/^\d+\.\d+$/)) return parseFloat(defaultStr);
    if (defaultStr.startsWith('"') && defaultStr.endsWith('"')) {
      return defaultStr.slice(1, -1);
    }
    if (defaultStr.startsWith('[') && defaultStr.endsWith(']')) {
      try {
        return JSON.parse(defaultStr);
      } catch {
        return defaultStr;
      }
    }
    if (defaultStr.startsWith('{') && defaultStr.endsWith('}')) {
      try {
        return JSON.parse(defaultStr);
      } catch {
        return defaultStr;
      }
    }

    return defaultStr;
  }

  /**
   * Get list of available modules
   */
  static async getAvailableModules(): Promise<TerraformModule[]> {
    await this.initialize();
    return Array.from(this.moduleRegistry.values());
  }

  /**
   * Get module by category and name
   */
  static async getModule(category: string, name: string): Promise<TerraformModule | null> {
    await this.initialize();
    const moduleKey = `${category}/${name}`;
    return this.moduleRegistry.get(moduleKey) || null;
  }

  /**
   * Get modules by category
   */
  static async getModulesByCategory(category: string): Promise<TerraformModule[]> {
    await this.initialize();
    return Array.from(this.moduleRegistry.values())
      .filter(module => module.category === category);
  }

  /**
   * Search modules by query
   */
  static async searchModules(query: string): Promise<TerraformModule[]> {
    await this.initialize();
    const lowerQuery = query.toLowerCase();

    return Array.from(this.moduleRegistry.values())
      .filter(module =>
        module.name.toLowerCase().includes(lowerQuery) ||
        module.description.toLowerCase().includes(lowerQuery) ||
        module.category.toLowerCase().includes(lowerQuery) ||
        module.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
  }

  /**
   * Get module metadata
   */
  static async getModuleMetadata(category: string, name: string): Promise<ModuleMetadata | null> {
    const module = await this.getModule(category, name);

    if (!module) return null;

    return {
      name: module.name,
      category: module.category,
      description: module.description,
      version: module.version,
      author: 'Darch Team',
      source: `./terraform-modules/${category}/${name}`,
      documentation: `Documentation for ${category}/${name} module`,
      examples: [],
      dependencies: module.dependencies,
      tags: module.tags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Validate module configuration
   */
  static async validateModuleConfiguration(
    category: string,
    name: string,
    configuration: Record<string, any>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const module = await this.getModule(category, name);

    if (!module) {
      return { valid: false, errors: [`Module ${category}/${name} not found`] };
    }

    const errors: string[] = [];

    // Check required variables
    for (const variable of module.variables) {
      if (variable.required && !(variable.name in configuration)) {
        errors.push(`Required variable '${variable.name}' is missing`);
      }
    }

    // Check variable types (basic validation)
    for (const [key, value] of Object.entries(configuration)) {
      const variable = module.variables.find(v => v.name === key);
      if (variable) {
        const typeError = this.validateVariableType(variable, value);
        if (typeError) {
          errors.push(typeError);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate variable type
   */
  private static validateVariableType(variable: ModuleVariable, value: any): string | null {
    const { name, type } = variable;

    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return `Variable '${name}' should be a string, got ${typeof value}`;
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          return `Variable '${name}' should be a number, got ${typeof value}`;
        }
        break;
      case 'bool':
        if (typeof value !== 'boolean') {
          return `Variable '${name}' should be a boolean, got ${typeof value}`;
        }
        break;
      case 'list(string)':
        if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
          return `Variable '${name}' should be a list of strings`;
        }
        break;
      case 'map(string)':
        if (typeof value !== 'object' || Array.isArray(value)) {
          return `Variable '${name}' should be a map of strings`;
        }
        break;
    }

    return null;
  }

  /**
   * Get directories in a path
   */
  private static async getDirectories(dirPath: string): Promise<string[]> {
    if (!fs.existsSync(dirPath)) {
      return [];
    }

    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    return items
      .filter(item => item.isDirectory())
      .map(item => item.name);
  }

  /**
   * Refresh module registry
   */
  static async refresh(): Promise<void> {
    this.moduleRegistry.clear();
    this.initialized = false;
    await this.initialize();
  }
}
