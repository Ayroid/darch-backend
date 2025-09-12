import { Request, Response } from 'express';
import { ArchitectureData } from '../models/Architecture.js';
import { CleanArchitectureData } from '../models/CleanArchitecture.js';
import { ArchitectureParserService } from '../services/ArchitectureParserService.js';
import { ArchitectureConverterService } from '../services/ArchitectureConverterService.js';
import { FrontendArchitectureTransformerService } from '../services/FrontendArchitectureTransformerService.js';
import { ModuleMapperService } from '../services/ModuleMapperService.js';
import { ModularTerraformGeneratorService } from '../services/ModularTerraformGeneratorService.js';
import { ModuleRegistryService } from '../services/ModuleRegistryService.js';
import { FileService } from '../services/FileService.js';
import { ResponseView } from '../views/ResponseView.js';

export class TerraformController {

  /**
   * Generate modular Terraform configuration from architecture data
   * Supports both legacy and clean architecture data formats
   */
  static async generateModularTerraform(req: Request, res: Response): Promise<void> {
    try {
      const { architectureData, projectName = 'infrastructure' }: {
        architectureData: ArchitectureData | CleanArchitectureData,
        projectName?: string
      } = req.body;

      if (!architectureData) {
        const errorResponse = ResponseView.error('Architecture data is required');
        res.status(400).json(errorResponse);
        return;
      }

      console.log('📝 Processing modular Terraform generation request...');

      // Detect format and convert if necessary
      let processedArchitectureData: ArchitectureData;

      if (TerraformController.isFrontendFormat(architectureData)) {
        console.log('🎨 Detected frontend format, transforming to backend format...');

        // Validate frontend format first
        const frontendValidation = FrontendArchitectureTransformerService.validateFrontendData(architectureData);

        if (!frontendValidation.valid) {
          const errorResponse = ResponseView.error(
            'Frontend architecture validation failed',
            frontendValidation.errors.join('; ')
          );
          res.status(400).json(errorResponse);
          return;
        }

        // Transform frontend data to backend format
        const transformationResult = FrontendArchitectureTransformerService.transformToBackendFormat(architectureData as any);

        if (transformationResult.errors.length > 0) {
          const errorResponse = ResponseView.error(
            'Frontend architecture transformation failed',
            transformationResult.errors.join('; ')
          );
          res.status(400).json(errorResponse);
          return;
        }

        processedArchitectureData = transformationResult.transformed;
        console.log(`✅ Frontend transformation completed: ${transformationResult.mappings.length} resources transformed`);

      } else if (TerraformController.isCleanFormat(architectureData)) {
        console.log('🔄 Detected clean format, converting to legacy format...');

        // Validate clean format first
        const cleanValidation = ArchitectureConverterService.validateCleanArchitecture(
          architectureData as CleanArchitectureData
        );

        if (!cleanValidation.valid) {
          const errorResponse = ResponseView.error(
            'Clean architecture validation failed',
            cleanValidation.errors.join('; ')
          );
          res.status(400).json(errorResponse);
          return;
        }

        processedArchitectureData = ArchitectureConverterService.convertToLegacy(
          architectureData as CleanArchitectureData
        );
      } else {
        console.log('📄 Detected legacy format, proceeding...');
        processedArchitectureData = architectureData as ArchitectureData;
      }

      // Step 1: Parse and validate architecture
      const parsedArchitecture = ArchitectureParserService.parseArchitecture(processedArchitectureData);

      if (!parsedArchitecture.validation.valid) {
        const errorResponse = ResponseView.error(
          'Architecture validation failed',
          parsedArchitecture.validation.errors.map(e => e.message).join('; ')
        );
        res.status(400).json(errorResponse);
        return;
      }

      // Step 2: Map architecture to modules
      const mappingResult = await ModuleMapperService.mapArchitectureToModules(parsedArchitecture);

      if (mappingResult.errors.length > 0) {
        const errorResponse = ResponseView.error(
          'Failed to map architecture to modules',
          mappingResult.errors.join('; ')
        );
        res.status(500).json(errorResponse);
        return;
      }

      // Step 3: Generate Terraform configuration
      const terraformResult = ModularTerraformGeneratorService.generateTerraformConfiguration(
        mappingResult,
        parsedArchitecture.metadata,
        projectName
      );

      // Step 4: Save generated files
      const savedFiles = await FileService.saveGeneratedTerraformFiles(terraformResult, projectName);

      // Step 5: Validate generated Terraform
      const validationResult = ModularTerraformGeneratorService.validateTerraformSyntax(
        terraformResult.mainTf
      );

      const response = ResponseView.success({
        terraformConfiguration: terraformResult,
        savedFiles,
        validation: validationResult,
        architectureValidation: parsedArchitecture.validation,
        moduleMapping: {
          modulesGenerated: mappingResult.modules.length,
          dependencies: mappingResult.dependencies.length,
          warnings: mappingResult.warnings
        },
        projectName,
        formatUsed: TerraformController.isFrontendFormat(architectureData)
          ? 'frontend'
          : TerraformController.isCleanFormat(architectureData)
            ? 'clean'
            : 'legacy'
      }, 'Modular Terraform configuration generated successfully');

      res.json(response);

    } catch (error) {
      console.error('❌ Error generating modular Terraform:', error);
      const errorResponse = ResponseView.error(
        'Failed to generate modular Terraform configuration',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Validate architecture design before generation
   */
  static async validateArchitecture(req: Request, res: Response): Promise<void> {
    try {
      const { architectureData }: { architectureData: ArchitectureData } = req.body;

      if (!architectureData) {
        const errorResponse = ResponseView.error('Architecture data is required');
        res.status(400).json(errorResponse);
        return;
      }

      console.log('🔍 Validating architecture design...');

      const parsedArchitecture = ArchitectureParserService.parseArchitecture(architectureData);

      const response = ResponseView.success({
        validation: parsedArchitecture.validation,
        nodes: parsedArchitecture.nodes.length,
        connections: parsedArchitecture.connections.length,
        metadata: parsedArchitecture.metadata
      }, 'Architecture validation completed');

      res.json(response);

    } catch (error) {
      console.error('❌ Error validating architecture:', error);
      const errorResponse = ResponseView.error(
        'Failed to validate architecture',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Validate dependencies in architecture
   */
  static async validateDependencies(req: Request, res: Response): Promise<void> {
    try {
      const { architectureData }: { architectureData: ArchitectureData } = req.body;

      if (!architectureData) {
        const errorResponse = ResponseView.error('Architecture data is required');
        res.status(400).json(errorResponse);
        return;
      }

      console.log('🔗 Validating resource dependencies...');

      const parsedArchitecture = ArchitectureParserService.parseArchitecture(architectureData);
      const mappingResult = await ModuleMapperService.mapArchitectureToModules(parsedArchitecture);

      // Build dependency visualization
      const dependencyGraph = this.buildDependencyVisualization(
        parsedArchitecture.nodes,
        mappingResult.dependencies
      );

      const response = ResponseView.success({
        dependencyGraph,
        circularDependencies: parsedArchitecture.validation.errors
          .filter(e => e.type === 'invalid_dependency')
          .map(e => e.message),
        dependencyLevels: mappingResult.dependencies.map(d => ({
          module: d.moduleId,
          level: d.level,
          dependsOn: d.dependsOn
        }))
      }, 'Dependency validation completed');

      res.json(response);

    } catch (error) {
      console.error('❌ Error validating dependencies:', error);
      const errorResponse = ResponseView.error(
        'Failed to validate dependencies',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get available Terraform modules
   */
  static async getAvailableModules(req: Request, res: Response): Promise<void> {
    try {
      console.log('📦 Fetching available Terraform modules...');

      const modules = await ModuleRegistryService.getAvailableModules();
      const modulesByCategory = modules.reduce((acc, module) => {
        if (!acc[module.category]) {
          acc[module.category] = [];
        }
        acc[module.category].push(module);
        return acc;
      }, {} as Record<string, any[]>);

      const response = ResponseView.success({
        modules,
        modulesByCategory,
        totalModules: modules.length,
        categories: Object.keys(modulesByCategory)
      }, 'Available modules retrieved successfully');

      res.json(response);

    } catch (error) {
      console.error('❌ Error fetching modules:', error);
      const errorResponse = ResponseView.error(
        'Failed to fetch available modules',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get specific module details
   */
  static async getModuleDetails(req: Request, res: Response): Promise<void> {
    try {
      const { category, name } = req.params;

      if (!category || !name) {
        const errorResponse = ResponseView.error('Category and name are required');
        res.status(400).json(errorResponse);
        return;
      }

      console.log(`📋 Fetching details for module: ${category}/${name}`);

      const module = await ModuleRegistryService.getModule(category, name);
      if (!module) {
        const errorResponse = ResponseView.error(`Module ${category}/${name} not found`);
        res.status(404).json(errorResponse);
        return;
      }

      const metadata = await ModuleRegistryService.getModuleMetadata(category, name);

      const response = ResponseView.success({
        module,
        metadata
      }, 'Module details retrieved successfully');

      res.json(response);

    } catch (error) {
      console.error('❌ Error fetching module details:', error);
      const errorResponse = ResponseView.error(
        'Failed to fetch module details',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Validate module configuration
   */
  static async validateModuleConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { category, name, configuration } = req.body;

      if (!category || !name || !configuration) {
        const errorResponse = ResponseView.error('Category, name, and configuration are required');
        res.status(400).json(errorResponse);
        return;
      }

      console.log(`✅ Validating configuration for module: ${category}/${name}`);

      const validation = await ModuleRegistryService.validateModuleConfiguration(
        category,
        name,
        configuration
      );

      const response = ResponseView.success({
        validation,
        module: `${category}/${name}`,
        configuration
      }, 'Module configuration validation completed');

      res.json(response);

    } catch (error) {
      console.error('❌ Error validating module configuration:', error);
      const errorResponse = ResponseView.error(
        'Failed to validate module configuration',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Generate Terraform plan preview
   */
  static async generateTerraformPlan(req: Request, res: Response): Promise<void> {
    try {
      const { architectureData, projectName = 'infrastructure' }: {
        architectureData: ArchitectureData,
        projectName?: string
      } = req.body;

      if (!architectureData) {
        const errorResponse = ResponseView.error('Architecture data is required');
        res.status(400).json(errorResponse);
        return;
      }

      console.log('📋 Generating Terraform plan preview...');

      // Parse and map architecture
      const parsedArchitecture = ArchitectureParserService.parseArchitecture(architectureData);
      const mappingResult = await ModuleMapperService.mapArchitectureToModules(parsedArchitecture);

      // Generate resource summary for plan preview
      const resourceSummary = this.generateResourceSummary(mappingResult.modules);
      const costEstimate = this.generateCostEstimate(mappingResult.modules);

      const response = ResponseView.success({
        resourceSummary,
        costEstimate,
        modules: mappingResult.modules.map(m => ({
          name: m.name,
          source: m.source,
          variableCount: Object.keys(m.variables).length
        })),
        dependencies: mappingResult.dependencies.length,
        warnings: mappingResult.warnings
      }, 'Terraform plan preview generated');

      res.json(response);

    } catch (error) {
      console.error('❌ Error generating Terraform plan:', error);
      const errorResponse = ResponseView.error(
        'Failed to generate Terraform plan',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Refresh module registry
   */
  static async refreshModuleRegistry(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 Refreshing module registry...');

      await ModuleRegistryService.refresh();
      const modules = await ModuleRegistryService.getAvailableModules();

      const response = ResponseView.success({
        modulesLoaded: modules.length,
        categories: [...new Set(modules.map(m => m.category))]
      }, 'Module registry refreshed successfully');

      res.json(response);

    } catch (error) {
      console.error('❌ Error refreshing module registry:', error);
      const errorResponse = ResponseView.error(
        'Failed to refresh module registry',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get list of generated Terraform files
   */
  static async getTerraformFiles(req: Request, res: Response): Promise<void> {
    try {
      const files = FileService.getTerraformFiles();
      const response = ResponseView.terraformFilesList(files);
      res.json(response);

    } catch (error) {
      console.error('❌ Error listing terraform files:', error);
      const errorResponse = ResponseView.error('Failed to list terraform files');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get content of a specific Terraform file
   */
  static async getTerraformFileContent(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;
      const content = FileService.getTerraformFileContent(filename);

      if (!content) {
        const errorResponse = ResponseView.error('Terraform file not found');
        res.status(404).json(errorResponse);
        return;
      }

      const response = ResponseView.terraformFileContent(filename, content);
      res.json(response);

    } catch (error) {
      console.error('❌ Error reading terraform file:', error);
      const errorResponse = ResponseView.error('Failed to read terraform file');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Download Terraform file as attachment
   */
  static async downloadTerraformFile(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;
      const filePath = FileService.getTerraformFilePath(filename);

      if (!filePath) {
        const errorResponse = ResponseView.error('Terraform file not found');
        res.status(404).json(errorResponse);
        return;
      }

      res.download(filePath, filename);

    } catch (error) {
      console.error('❌ Error downloading terraform file:', error);
      const errorResponse = ResponseView.error('Failed to download terraform file');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Download all Terraform files for a project as a ZIP archive
   */
  static async downloadProjectZip(req: Request, res: Response): Promise<void> {
    try {
      const { projectName } = req.params;
      const zipBuffer = await FileService.createProjectZip(projectName);

      if (!zipBuffer) {
        const errorResponse = ResponseView.error('Project not found or no files available');
        res.status(404).json(errorResponse);
        return;
      }

      // Set appropriate headers for ZIP file download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${projectName}-terraform.zip"`);
      res.setHeader('Content-Length', zipBuffer.length);

      res.send(zipBuffer);

    } catch (error) {
      console.error('❌ Error creating project ZIP:', error);
      const errorResponse = ResponseView.error('Failed to create project ZIP file');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get list of available projects
   */
  static async getProjects(req: Request, res: Response): Promise<void> {
    try {
      const projects = FileService.getAvailableProjects();
      const response = ResponseView.projectsList(projects);
      res.json(response);

    } catch (error) {
      console.error('❌ Error listing projects:', error);
      const errorResponse = ResponseView.error('Failed to list projects');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get files in a specific project
   */
  static async getProjectFiles(req: Request, res: Response): Promise<void> {
    try {
      const { projectName } = req.params;
      const files = FileService.getProjectFiles(projectName);

      if (files.length === 0) {
        const errorResponse = ResponseView.error('Project not found or no files available');
        res.status(404).json(errorResponse);
        return;
      }

      const response = ResponseView.terraformFilesList(files);
      res.json(response);

    } catch (error) {
      console.error('❌ Error listing project files:', error);
      const errorResponse = ResponseView.error('Failed to list project files');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Build dependency visualization data
   */
  private static buildDependencyVisualization(
    nodes: any[],
    dependencies: any[]
  ): any {
    const dependencyMap = new Map(dependencies.map(d => [d.moduleId, d]));

    return {
      nodes: nodes.map(node => ({
        id: node.id,
        name: node.name,
        type: node.resourceType,
        module: node.terraformModule,
        level: dependencyMap.get(node.id)?.level || 0
      })),
      edges: dependencies.flatMap(dep =>
        dep.dependsOn.map((source: string) => ({
          source,
          target: dep.moduleId,
          type: 'dependency'
        }))
      )
    };
  }

  /**
   * Generate resource summary for plan preview
   */
  private static generateResourceSummary(modules: any[]): any {
    const summary = {
      totalResources: 0,
      resourceTypes: {} as Record<string, number>,
      modules: modules.length
    };

    for (const module of modules) {
      summary.totalResources++;
      const category = module.source.split('/')[2]; // Extract category from path
      summary.resourceTypes[category] = (summary.resourceTypes[category] || 0) + 1;
    }

    return summary;
  }

  /**
   * Generate basic cost estimate
   */
  private static generateCostEstimate(modules: any[]): any {
    // Basic cost estimation - in production, integrate with AWS Pricing API
    const baseCosts: Record<string, number> = {
      'vpc': 0,
      'subnet': 0,
      'ec2': 15, // t3.micro monthly
      'security-group': 0,
      's3': 5, // estimated monthly
      'rds': 25 // db.t3.micro monthly
    };

    let totalEstimate = 0;
    const breakdown: Record<string, number> = {};

    for (const module of modules) {
      const moduleName = module.source.split('/').pop();
      const cost = baseCosts[moduleName] || 0;
      totalEstimate += cost;
      breakdown[moduleName] = (breakdown[moduleName] || 0) + cost;
    }

    return {
      monthlyEstimate: totalEstimate,
      breakdown,
      currency: 'USD',
      disclaimer: 'This is a rough estimate. Actual costs may vary based on usage and AWS pricing changes.'
    };
  }

  /**
   * Detect if the architecture data is in frontend format
   */
  private static isFrontendFormat(data: any): boolean {
    // Check for frontend format structure
    return !!(
      data.metadata &&
      data.nodes &&
      Array.isArray(data.nodes) &&
      data.nodes.length > 0 &&
      data.nodes.some((node: any) =>
        node.nodeType &&
        (node.nodeType === 'awsService' || node.nodeType === 'awsContainer') &&
        node.resourceType &&
        node.resourceType.startsWith('aws-')
      )
    );
  }

  /**
   * Detect if the architecture data is in clean format or legacy format
   */
  private static isCleanFormat(data: any): boolean {
    // Check for clean format structure
    return !!(
      data.metadata &&
      data.infrastructure &&
      data.deployment &&
      data.infrastructure.network &&
      data.infrastructure.compute &&
      data.infrastructure.security
    );
  }

  /**
   * Convert clean format architecture data example
   */
  static async convertToCleanFormat(req: Request, res: Response): Promise<void> {
    try {
      const { architectureData }: { architectureData: ArchitectureData } = req.body;

      if (!architectureData) {
        const errorResponse = ResponseView.error('Architecture data is required');
        res.status(400).json(errorResponse);
        return;
      }

      console.log('🔄 Converting legacy format to clean format...');

      const cleanData = ArchitectureConverterService.convertFromLegacy(architectureData);
      const validation = ArchitectureConverterService.validateCleanArchitecture(cleanData);

      const response = ResponseView.success({
        cleanArchitectureData: cleanData,
        validation,
        conversionNotes: [
          'Position information has been reset as it\'s not part of the clean format',
          'Some configuration may have been normalized during conversion',
          'Review the converted data before using in production'
        ]
      }, 'Architecture data converted to clean format successfully');

      res.json(response);

    } catch (error) {
      console.error('❌ Error converting to clean format:', error);
      const errorResponse = ResponseView.error(
        'Failed to convert architecture data to clean format',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get example clean format architecture data
   */
  static async getCleanFormatExample(req: Request, res: Response): Promise<void> {
    try {
      console.log('📋 Generating clean format example...');

      const exampleData = ArchitectureConverterService.generateExampleCleanData();

      const response = ResponseView.success({
        exampleCleanData: exampleData,
        description: 'Example clean architecture data format',
        usage: 'Use this structure as a template for your own architecture definitions'
      }, 'Clean format example generated successfully');

      res.json(response);

    } catch (error) {
      console.error('❌ Error generating clean format example:', error);
      const errorResponse = ResponseView.error(
        'Failed to generate clean format example',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(500).json(errorResponse);
    }
  }
}
