import { Request, Response } from "express";
import { ArchitectureData } from "../models/Architecture.js";
import { ArchitectureParserService } from "../services/ArchitectureParserService.js";
import { FrontendArchitectureTransformerService } from "../services/FrontendArchitectureTransformerService.js";
import { ModuleMapperService } from "../services/ModuleMapperService.js";
import { ModularTerraformGeneratorService } from "../services/ModularTerraformGeneratorService.js";
import { ModuleRegistryService } from "../services/ModuleRegistryService.js";
import { FileService } from "../services/FileService.js";
import { TerraformExecutionService } from "../services/TerraformExecutionService.js";
import { ResponseView } from "../views/ResponseView.js";
import { logger, LogCategory, LogLevel } from "../utils/Logger.js";

interface RequestWithId extends Request {
  requestId?: string;
}

export class TerraformController {
	/**
	 * Generate modular Terraform configuration from architecture data
	 */
	static async generateModularTerraform(
		req: RequestWithId,
		res: Response
	): Promise<void> {
		const startTime = Date.now();
		let projectName = "infrastructure"; // Default value for error logging

		try {
			const {
				architectureData,
				projectName: reqProjectName = "infrastructure",
			}: {
				architectureData: ArchitectureData;
				projectName?: string;
			} = req.body;

			projectName = reqProjectName; // Update for actual use

			logger.terraform(LogLevel.INFO, '📝 Processing modular Terraform generation request', {
				requestId: req.requestId,
				projectName,
				hasArchitectureData: !!architectureData,
				component: 'TerraformController',
				operation: 'generateModularTerraform'
			});

			if (!architectureData) {
				logger.validation(LogLevel.WARN, '❌ Architecture data validation failed', {
					requestId: req.requestId,
					error: 'Architecture data is required',
					component: 'TerraformController'
				});

				const errorResponse = ResponseView.error(
					"Architecture data is required"
				);
				res.status(400).json(errorResponse);
				return;
			}

			// Detect format and convert if necessary
			let processedArchitectureData: ArchitectureData;

			if (TerraformController.isFrontendFormat(architectureData)) {
				logger.architecture(LogLevel.INFO, '🎨 Detected frontend format, transforming to backend format', {
					requestId: req.requestId,
					projectName,
					component: 'TerraformController'
				});

				// Validate frontend format first
				const frontendValidation =
					FrontendArchitectureTransformerService.validateFrontendData(
						architectureData
					);

				if (!frontendValidation.valid) {
					const errorResponse = ResponseView.error(
						"Frontend architecture validation failed",
						frontendValidation.errors.join("; ")
					);
					res.status(400).json(errorResponse);
					return;
				}

				// Transform frontend data to backend format
				const transformationResult =
					FrontendArchitectureTransformerService.transformToBackendFormat(
						architectureData as any
					);

				if (transformationResult.errors.length > 0) {
					const errorResponse = ResponseView.error(
						"Frontend architecture transformation failed",
						transformationResult.errors.join("; ")
					);
					res.status(400).json(errorResponse);
					return;
				}

				processedArchitectureData = transformationResult.transformed;

				logger.architecture(LogLevel.INFO, '✅ Frontend transformation completed', {
					requestId: req.requestId,
					projectName,
					transformedResourcesCount: transformationResult.mappings.length,
					component: 'TerraformController'
				});
			} else {
				logger.architecture(LogLevel.INFO, '📄 Detected legacy format, proceeding', {
					requestId: req.requestId,
					projectName,
					component: 'TerraformController'
				});

				processedArchitectureData = architectureData as ArchitectureData;
			}

			// Step 1: Parse and validate architecture
			const parsedArchitecture = ArchitectureParserService.parseArchitecture(
				processedArchitectureData
			);

			if (!parsedArchitecture.validation.valid) {
				const errorResponse = ResponseView.error(
					"Architecture validation failed",
					parsedArchitecture.validation.errors.map((e) => e.message).join("; ")
				);
				res.status(400).json(errorResponse);
				return;
			}

			// Step 2: Map architecture to modules
			const mappingResult = await ModuleMapperService.mapArchitectureToModules(
				parsedArchitecture
			);

			if (mappingResult.errors.length > 0) {
				const errorResponse = ResponseView.error(
					"Failed to map architecture to modules",
					mappingResult.errors.join("; ")
				);
				res.status(500).json(errorResponse);
				return;
			}

			// Step 3: Generate Terraform configuration
			const terraformResult =
				ModularTerraformGeneratorService.generateTerraformConfiguration(
					mappingResult,
					parsedArchitecture.metadata,
					projectName
				);

			// Step 4: Save generated files
			const savedFiles = await FileService.saveGeneratedTerraformFiles(
				terraformResult,
				projectName
			);

			// Step 5: Validate generated Terraform
			const validationResult =
				ModularTerraformGeneratorService.validateTerraformSyntax(
					terraformResult.mainTf
				);

			const response = ResponseView.success(
				{
					project: {
						name: projectName,
						path: savedFiles.projectDir,
						generatedAt: new Date().toISOString(),
					},
					files: {
						generated: savedFiles.files.length,
						list: savedFiles.files,
					},
					validation: {
						syntaxValid: validationResult.valid,
						errors: validationResult.errors,
					},
					architectureValidation: {
						valid: parsedArchitecture.validation.valid,
						errorCount: parsedArchitecture.validation.errors.length,
						warningCount: parsedArchitecture.validation.warnings?.length || 0,
					},
					moduleMapping: {
						modulesGenerated: mappingResult.modules.length,
						dependencies: mappingResult.dependencies.length,
						warnings: mappingResult.warnings,
					},
					formatUsed: TerraformController.isFrontendFormat(architectureData)
						? "frontend"
						: "legacy",
					status: "success",
				},
				"Modular Terraform configuration generated successfully"
			);

			res.json(response);
		} catch (error) {
			const duration = Date.now() - startTime;

			logger.error('❌ Error generating modular Terraform', {
				requestId: req.requestId,
				projectName,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				duration,
				category: LogCategory.TERRAFORM,
				component: 'TerraformController',
				operation: 'generateModularTerraform'
			});

			const errorResponse = ResponseView.error(
				"Failed to generate modular Terraform configuration",
				error instanceof Error ? error.message : "Unknown error"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Validate architecture design before generation
	 */
	static async validateArchitecture(
		req: RequestWithId,
		res: Response
	): Promise<void> {
		const startTime = Date.now();

		try {
			const { architectureData }: { architectureData: ArchitectureData } =
				req.body;

			logger.validation(LogLevel.INFO, '🔍 Validating architecture design', {
				requestId: req.requestId,
				hasArchitectureData: !!architectureData,
				component: 'TerraformController',
				operation: 'validateArchitecture'
			});

			if (!architectureData) {
				logger.validation(LogLevel.WARN, '❌ Architecture data validation failed', {
					requestId: req.requestId,
					error: 'Architecture data is required',
					component: 'TerraformController'
				});

				const errorResponse = ResponseView.error(
					"Architecture data is required"
				);
				res.status(400).json(errorResponse);
				return;
			}

			const parsedArchitecture =
				ArchitectureParserService.parseArchitecture(architectureData);

			const response = ResponseView.success(
				{
					validation: parsedArchitecture.validation,
					nodes: parsedArchitecture.nodes.length,
					connections: parsedArchitecture.connections.length,
					metadata: parsedArchitecture.metadata,
				},
				"Architecture validation completed"
			);

			res.json(response);
		} catch (error) {
			const duration = Date.now() - startTime;

			logger.error('❌ Error validating architecture', {
				requestId: req.requestId,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				duration,
				category: LogCategory.VALIDATION,
				component: 'TerraformController',
				operation: 'validateArchitecture'
			});

			const errorResponse = ResponseView.error(
				"Failed to validate architecture",
				error instanceof Error ? error.message : "Unknown error"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Validate dependencies in architecture
	 */
	static async validateDependencies(
		req: RequestWithId,
		res: Response
	): Promise<void> {
		const startTime = Date.now();

		try {
			const { architectureData }: { architectureData: ArchitectureData } =
				req.body;

			if (!architectureData) {
				const errorResponse = ResponseView.error(
					"Architecture data is required"
				);
				res.status(400).json(errorResponse);
				return;
			}

			logger.validation(LogLevel.INFO, '🔗 Validating resource dependencies', {
				requestId: req.requestId,
				component: 'TerraformController',
				operation: 'validateDependencies'
			});

			const parsedArchitecture =
				ArchitectureParserService.parseArchitecture(architectureData);
			const mappingResult = await ModuleMapperService.mapArchitectureToModules(
				parsedArchitecture
			);

			// Build dependency visualization
			const dependencyGraph = this.buildDependencyVisualization(
				parsedArchitecture.nodes,
				mappingResult.dependencies
			);

			const response = ResponseView.success(
				{
					dependencyGraph,
					circularDependencies: parsedArchitecture.validation.errors
						.filter((e) => e.type === "invalid_dependency")
						.map((e) => e.message),
					dependencyLevels: mappingResult.dependencies.map((d) => ({
						module: d.moduleId,
						level: d.level,
						dependsOn: d.dependsOn,
					})),
				},
				"Dependency validation completed"
			);

			res.json(response);
		} catch (error) {
			const duration = Date.now() - startTime;

			logger.error('❌ Error validating dependencies', {
				requestId: req.requestId,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				duration,
				category: LogCategory.VALIDATION,
				component: 'TerraformController',
				operation: 'validateDependencies'
			});

			const errorResponse = ResponseView.error(
				"Failed to validate dependencies",
				error instanceof Error ? error.message : "Unknown error"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Get available Terraform modules
	 */
	static async getAvailableModules(req: RequestWithId, res: Response): Promise<void> {
		const startTime = Date.now();

		try {
			logger.module(LogLevel.INFO, '📦 Fetching available Terraform modules', {
				requestId: req.requestId,
				component: 'TerraformController',
				operation: 'getAvailableModules'
			});

			const modules = await ModuleRegistryService.getAvailableModules();
			const modulesByCategory = modules.reduce((acc, module) => {
				if (!acc[module.category]) {
					acc[module.category] = [];
				}
				acc[module.category].push(module);
				return acc;
			}, {} as Record<string, any[]>);

			const response = ResponseView.success(
				{
					modules,
					modulesByCategory,
					totalModules: modules.length,
					categories: Object.keys(modulesByCategory),
				},
				"Available modules retrieved successfully"
			);

			res.json(response);
		} catch (error) {
			const duration = Date.now() - startTime;

			logger.error('❌ Error fetching modules', {
				requestId: req.requestId,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				duration,
				category: LogCategory.MODULE,
				component: 'TerraformController',
				operation: 'getAvailableModules'
			});

			const errorResponse = ResponseView.error(
				"Failed to fetch available modules",
				error instanceof Error ? error.message : "Unknown error"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Get specific module details
	 */
	static async getModuleDetails(req: RequestWithId, res: Response): Promise<void> {
		try {
			const { category, name } = req.params;

			if (!category || !name) {
				const errorResponse = ResponseView.error(
					"Category and name are required"
				);
				res.status(400).json(errorResponse);
				return;
			}

			logger.module(LogLevel.INFO, '📋 Fetching module details', {
				requestId: req.requestId,
				moduleCategory: category,
				moduleName: name,
				moduleKey: `${category}/${name}`,
				component: 'TerraformController',
				operation: 'getModuleDetails'
			});

			const module = await ModuleRegistryService.getModule(category, name);
			if (!module) {
				const errorResponse = ResponseView.error(
					`Module ${category}/${name} not found`
				);
				res.status(404).json(errorResponse);
				return;
			}

			const metadata = await ModuleRegistryService.getModuleMetadata(
				category,
				name
			);

			const response = ResponseView.success(
				{
					module,
					metadata,
				},
				"Module details retrieved successfully"
			);

			res.json(response);
		} catch (error) {
			logger.error("❌ Error fetching module details", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.MODULE,
				component: 'TerraformController',
				operation: 'getModuleDetails',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error(
				"Failed to fetch module details",
				error instanceof Error ? error.message : "Unknown error"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Validate module configuration
	 */
	static async validateModuleConfiguration(
		req: Request,
		res: Response
	): Promise<void> {
		try {
			const { category, name, configuration } = req.body;

			if (!category || !name || !configuration) {
				const errorResponse = ResponseView.error(
					"Category, name, and configuration are required"
				);
				res.status(400).json(errorResponse);
				return;
			}

			logger.info(`✅ Validating configuration for module: ${category}/${name}`, {
				category: LogCategory.VALIDATION,
				component: 'TerraformController',
				operation: 'validateModuleConfiguration',
				moduleName: `${category}/${name}`,
				requestId: (req as any).id
			});

			const validation =
				await ModuleRegistryService.validateModuleConfiguration(
					category,
					name,
					configuration
				);

			const response = ResponseView.success(
				{
					validation,
					module: `${category}/${name}`,
					configuration,
				},
				"Module configuration validation completed"
			);

			res.json(response);
		} catch (error) {
			logger.error("❌ Error validating module configuration", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.VALIDATION,
				component: 'TerraformController',
				operation: 'validateModuleConfiguration',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error(
				"Failed to validate module configuration",
				error instanceof Error ? error.message : "Unknown error"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Generate Terraform plan with actual terraform execution
	 */
	static async generateTerraformPlan(
		req: Request,
		res: Response
	): Promise<void> {
		try {
			const {
				architectureData,
				projectName = "infrastructure",
			}: {
				architectureData: ArchitectureData;
				projectName?: string;
			} = req.body;

			if (!architectureData) {
				const errorResponse = ResponseView.error(
					"Architecture data is required"
				);
				res.status(400).json(errorResponse);
				return;
			}

			logger.info(`🚀 Starting async Terraform plan execution for project: ${projectName}`, {
				category: LogCategory.TERRAFORM,
				component: 'TerraformController',
				operation: 'executePlan',
				projectName,
				requestId: (req as any).id
			});

			// Check if project exists and get latest version
			const existingProjectPath = await FileService.getProjectPath(projectName);
			const latestVersionId = await FileService.getLatestProjectVersion(
				projectName
			);

			if (!existingProjectPath || !latestVersionId) {
				logger.error(`❌ Project '${projectName}' not found`, {
					category: LogCategory.FILE,
					component: 'TerraformController',
					operation: 'executePlan',
					projectName,
					requestId: (req as any).id
				});

				// List available projects for debugging
				const projects = await FileService.getAvailableProjects();
				const projectVersions = await FileService.getProjectVersions(
					projectName
				);
				logger.info("Available projects for debugging", {
					category: LogCategory.FILE,
					component: 'TerraformController',
					operation: 'executePlan-debug',
					availableProjects: projects.map((p) => p.name),
					availableVersions: projectVersions.map((p) => p.projectId),
					requestId: (req as any).id
				});

				const errorResponse = ResponseView.error(
					`Project '${projectName}' not found. Please generate Terraform files first.`,
					`Available projects: ${projects.map((p) => p.name).join(", ")}`
				);
				res.status(404).json(errorResponse);
				return;
			}

			logger.info(`📁 Using latest version '${latestVersionId}' at: ${existingProjectPath}`, {
				category: LogCategory.FILE,
				component: 'TerraformController',
				operation: 'executePlan',
				projectName,
				versionId: latestVersionId,
				projectPath: existingProjectPath,
				requestId: (req as any).id
			});

			// Validate that the project has necessary Terraform files
			const hasMainTf = await FileService.projectFileExists(
				projectName,
				"main.tf"
			);
			logger.info(`🔍 main.tf exists: ${hasMainTf}`, {
				category: LogCategory.FILE,
				component: 'TerraformController',
				operation: 'executePlan',
				projectName,
				hasMainTf,
				requestId: (req as any).id
			});

			if (!hasMainTf) {
				const errorResponse = ResponseView.error(
					`Project '${projectName}' is missing required Terraform files. Please regenerate the project.`
				);
				res.status(400).json(errorResponse);
				return;
			} // Process architecture data for validation only (not for regeneration)
			let processedArchitectureData: ArchitectureData;

			if (TerraformController.isFrontendFormat(architectureData)) {
				const transformationResult =
					FrontendArchitectureTransformerService.transformToBackendFormat(
						architectureData as any
					);
				if (transformationResult.errors.length > 0) {
					const errorResponse = ResponseView.error(
						"Frontend architecture transformation failed",
						transformationResult.errors.join("; ")
					);
					res.status(400).json(errorResponse);
					return;
				}
				processedArchitectureData = transformationResult.transformed;
			} else {
				processedArchitectureData = architectureData as ArchitectureData;
			}

			// Start async terraform plan execution using existing project
			const jobId = await TerraformExecutionService.startTerraformPlan(
				existingProjectPath,
				processedArchitectureData,
				projectName
			);

			const response = ResponseView.success(
				{
					jobId,
					status: "started",
					message: "Terraform plan execution started",
					projectPath: existingProjectPath,
					projectName,
					actualProjectId: latestVersionId,
					pollUrl: `/api/terraform/plan-status/${jobId}`,
				},
				"Terraform plan execution started successfully"
			);

			res.json(response);
		} catch (error) {
			logger.error("❌ Error starting Terraform plan execution", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
				component: 'TerraformController',
				operation: 'executePlan',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error(
				"Failed to start Terraform plan execution",
				error instanceof Error ? error.message : "Unknown error"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Get terraform plan job status (polling endpoint)
	 */
	static async getTerraformPlanStatus(
		req: Request,
		res: Response
	): Promise<void> {
		try {
			const { jobId } = req.params;

			if (!jobId) {
				const errorResponse = ResponseView.error("Job ID is required");
				res.status(400).json(errorResponse);
				return;
			}

			const jobStatus = TerraformExecutionService.getJobStatus(jobId);

			if (!jobStatus) {
				const errorResponse = ResponseView.error("Job not found");
				res.status(404).json(errorResponse);
				return;
			}

			const response = ResponseView.success(
				{
					jobId: jobStatus.id,
					status: jobStatus.status,
					progress: jobStatus.progress,
					message: jobStatus.message,
					result: jobStatus.result,
					error: jobStatus.error,
					createdAt: jobStatus.createdAt,
					updatedAt: jobStatus.updatedAt,
					logs: jobStatus.logs || [], // Include streaming logs
					rawOutput: jobStatus.rawOutput, // Include raw terraform output
				},
				`Job ${jobStatus.status}`
			);

			res.json(response);
		} catch (error) {
			logger.error("❌ Error getting plan status", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
				component: 'TerraformController',
				operation: 'getPlanStatus',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error(
				"Failed to get plan status",
				error instanceof Error ? error.message : "Unknown error"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Get all terraform plan jobs
	 */
	static async getAllTerraformPlanJobs(
		req: Request,
		res: Response
	): Promise<void> {
		try {
			const jobs = TerraformExecutionService.getAllJobs();

			const response = ResponseView.success(
				{
					jobs: jobs.map((job) => ({
						jobId: job.id,
						status: job.status,
						progress: job.progress,
						message: job.message,
						createdAt: job.createdAt,
						updatedAt: job.updatedAt,
					})),
					totalJobs: jobs.length,
				},
				"Retrieved all terraform plan jobs"
			);

			res.json(response);
		} catch (error) {
			logger.error("❌ Error getting all plan jobs", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
				component: 'TerraformController',
				operation: 'getAllPlanJobs',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error(
				"Failed to get plan jobs",
				error instanceof Error ? error.message : "Unknown error"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Delete completed terraform plan job
	 */
	static async deleteTerraformPlanJob(
		req: Request,
		res: Response
	): Promise<void> {
		try {
			const { jobId } = req.params;

			if (!jobId) {
				const errorResponse = ResponseView.error("Job ID is required");
				res.status(400).json(errorResponse);
				return;
			}

			const deleted = TerraformExecutionService.deleteJob(jobId);

			if (deleted) {
				const response = ResponseView.success(
					{
						jobId,
						deleted: true,
					},
					"Job deleted successfully"
				);
				res.json(response);
			} else {
				const errorResponse = ResponseView.error(
					"Job not found or could not be deleted"
				);
				res.status(404).json(errorResponse);
			}
		} catch (error) {
			logger.error("❌ Error deleting plan job", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
				component: 'TerraformController',
				operation: 'deletePlanJob',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error(
				"Failed to delete plan job",
				error instanceof Error ? error.message : "Unknown error"
			);
			res.status(500).json(errorResponse);
		}
	}

	// =====================================
	// TERRAFORM APPLY ENDPOINTS
	// =====================================

	/**
	 * Apply Terraform infrastructure with actual terraform execution
	 */
	static async generateTerraformApply(
		req: Request,
		res: Response
	): Promise<void> {
		try {
			const {
				architectureData,
				projectName = "infrastructure",
			}: {
				architectureData: ArchitectureData;
				projectName?: string;
			} = req.body;

			if (!architectureData) {
				const errorResponse = ResponseView.error(
					"Architecture data is required"
				);
				res.status(400).json(errorResponse);
				return;
			}

			logger.info(`🚀 Starting async Terraform apply execution for project: ${projectName}`, {
				category: LogCategory.TERRAFORM,
				component: 'TerraformController',
				operation: 'executeApply',
				projectName,
				requestId: (req as any).id
			});

			// Check if project exists and get latest version
			const existingProjectPath = await FileService.getProjectPath(projectName);
			const latestVersionId = await FileService.getLatestProjectVersion(
				projectName
			);

			if (!existingProjectPath || !latestVersionId) {
				logger.error(`❌ Project '${projectName}' not found`, {
					category: LogCategory.FILE,
					component: 'TerraformController',
					operation: 'executeApply',
					projectName,
					requestId: (req as any).id
				});

				const projects = await FileService.getAvailableProjects();
				const errorResponse = ResponseView.error(
					`Project '${projectName}' not found. Please generate Terraform files first.`,
					`Available projects: ${projects.map((p) => p.name).join(", ")}`
				);
				res.status(404).json(errorResponse);
				return;
			}

			logger.info(`📁 Using latest version '${latestVersionId}' at: ${existingProjectPath}`, {
				category: LogCategory.FILE,
				component: 'TerraformController',
				operation: 'executeApply',
				projectName,
				versionId: latestVersionId,
				projectPath: existingProjectPath,
				requestId: (req as any).id
			});

			// Validate that the project has necessary Terraform files
			const hasMainTf = await FileService.projectFileExists(
				projectName,
				"main.tf"
			);

			if (!hasMainTf) {
				const errorResponse = ResponseView.error(
					`Project '${projectName}' is missing required Terraform files. Please regenerate the project.`
				);
				res.status(400).json(errorResponse);
				return;
			}

			// Process architecture data for validation
			let processedArchitectureData: ArchitectureData;

			if (TerraformController.isFrontendFormat(architectureData)) {
				const transformationResult =
					FrontendArchitectureTransformerService.transformToBackendFormat(
						architectureData as any
					);
				if (transformationResult.errors.length > 0) {
					const errorResponse = ResponseView.error(
						"Frontend architecture transformation failed",
						transformationResult.errors.join("; ")
					);
					res.status(400).json(errorResponse);
					return;
				}
				processedArchitectureData = transformationResult.transformed;
			} else {
				processedArchitectureData = architectureData as ArchitectureData;
			}

			// Start async terraform apply execution
			const jobId = await TerraformExecutionService.startTerraformApply(
				existingProjectPath,
				processedArchitectureData,
				projectName
			);

			const response = ResponseView.success(
				{
					jobId,
					status: "started",
					message: "Terraform apply execution started",
					projectPath: existingProjectPath,
					projectName,
					actualProjectId: latestVersionId,
					pollUrl: `/api/terraform/apply-status/${jobId}`,
				},
				"Terraform apply execution started successfully"
			);

			res.json(response);
		} catch (error) {
			logger.error("❌ Error starting Terraform apply execution", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
				component: 'TerraformController',
				operation: 'executeApply',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error(
				"Failed to start Terraform apply execution",
				error instanceof Error ? error.message : "Unknown error"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Get terraform apply job status (polling endpoint)
	 */
	static async getTerraformApplyStatus(
		req: Request,
		res: Response
	): Promise<void> {
		try {
			const { jobId } = req.params;

			if (!jobId) {
				const errorResponse = ResponseView.error("Job ID is required");
				res.status(400).json(errorResponse);
				return;
			}

			const jobStatus = TerraformExecutionService.getJobStatus(jobId);

			if (!jobStatus) {
				const errorResponse = ResponseView.error("Job not found");
				res.status(404).json(errorResponse);
				return;
			}

			const response = ResponseView.success(
				{
					jobId: jobStatus.id,
					status: jobStatus.status,
					progress: jobStatus.progress,
					message: jobStatus.message,
					result: jobStatus.result,
					error: jobStatus.error,
					createdAt: jobStatus.createdAt,
					updatedAt: jobStatus.updatedAt,
					logs: jobStatus.logs || [],
					rawOutput: jobStatus.rawOutput,
				},
				`Job ${jobStatus.status}`
			);

			res.json(response);
		} catch (error) {
			logger.error("❌ Error getting apply status", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
				component: 'TerraformController',
				operation: 'getApplyStatus',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error(
				"Failed to get apply status",
				error instanceof Error ? error.message : "Unknown error"
			);
			res.status(500).json(errorResponse);
		}
	}

	// =====================================
	// TERRAFORM DESTROY ENDPOINTS
	// =====================================

	/**
	 * Destroy Terraform infrastructure with actual terraform execution
	 */
	static async generateTerraformDestroy(
		req: Request,
		res: Response
	): Promise<void> {
		try {
			const {
				projectName = "infrastructure",
				confirmDestroy = false,
			}: {
				projectName?: string;
				confirmDestroy?: boolean;
			} = req.body;

			if (!confirmDestroy) {
				const errorResponse = ResponseView.error(
					"Destroy confirmation is required. Set 'confirmDestroy: true' to proceed."
				);
				res.status(400).json(errorResponse);
				return;
			}

			logger.info(`🔥 Starting async Terraform destroy execution for project: ${projectName}`, {
				category: LogCategory.TERRAFORM,
				component: 'TerraformController',
				operation: 'executeDestroy',
				projectName,
				requestId: (req as any).id
			});

			// Check if project exists and get latest version
			const existingProjectPath = await FileService.getProjectPath(projectName);
			const latestVersionId = await FileService.getLatestProjectVersion(
				projectName
			);

			if (!existingProjectPath || !latestVersionId) {
				logger.error(`❌ Project '${projectName}' not found`, {
					category: LogCategory.FILE,
					component: 'TerraformController',
					operation: 'executeDestroy',
					projectName,
					requestId: (req as any).id
				});

				const projects = await FileService.getAvailableProjects();
				const errorResponse = ResponseView.error(
					`Project '${projectName}' not found.`,
					`Available projects: ${projects.map((p) => p.name).join(", ")}`
				);
				res.status(404).json(errorResponse);
				return;
			}

			logger.info(`📁 Using latest version '${latestVersionId}' at: ${existingProjectPath}`, {
				category: LogCategory.FILE,
				component: 'TerraformController',
				operation: 'executeDestroy',
				projectName,
				versionId: latestVersionId,
				projectPath: existingProjectPath,
				requestId: (req as any).id
			});

			// Validate that the project has necessary Terraform files
			const hasMainTf = await FileService.projectFileExists(
				projectName,
				"main.tf"
			);

			if (!hasMainTf) {
				const errorResponse = ResponseView.error(
					`Project '${projectName}' is missing required Terraform files.`
				);
				res.status(400).json(errorResponse);
				return;
			}

			// Start async terraform destroy execution
			const jobId = await TerraformExecutionService.startTerraformDestroy(
				existingProjectPath,
				projectName
			);

			const response = ResponseView.success(
				{
					jobId,
					status: "started",
					message: "Terraform destroy execution started",
					projectPath: existingProjectPath,
					projectName,
					actualProjectId: latestVersionId,
					pollUrl: `/api/terraform/destroy-status/${jobId}`,
				},
				"Terraform destroy execution started successfully"
			);

			res.json(response);
		} catch (error) {
			logger.error("❌ Error starting Terraform destroy execution", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
				component: 'TerraformController',
				operation: 'executeDestroy',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error(
				"Failed to start Terraform destroy execution",
				error instanceof Error ? error.message : "Unknown error"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Get terraform destroy job status (polling endpoint)
	 */
	static async getTerraformDestroyStatus(
		req: Request,
		res: Response
	): Promise<void> {
		try {
			const { jobId } = req.params;

			if (!jobId) {
				const errorResponse = ResponseView.error("Job ID is required");
				res.status(400).json(errorResponse);
				return;
			}

			const jobStatus = TerraformExecutionService.getJobStatus(jobId);

			if (!jobStatus) {
				const errorResponse = ResponseView.error("Job not found");
				res.status(404).json(errorResponse);
				return;
			}

			const response = ResponseView.success(
				{
					jobId: jobStatus.id,
					status: jobStatus.status,
					progress: jobStatus.progress,
					message: jobStatus.message,
					result: jobStatus.result,
					error: jobStatus.error,
					createdAt: jobStatus.createdAt,
					updatedAt: jobStatus.updatedAt,
					logs: jobStatus.logs || [],
					rawOutput: jobStatus.rawOutput,
				},
				`Job ${jobStatus.status}`
			);

			res.json(response);
		} catch (error) {
			logger.error("❌ Error getting destroy status", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
				component: 'TerraformController',
				operation: 'getDestroyStatus',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error(
				"Failed to get destroy status",
				error instanceof Error ? error.message : "Unknown error"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Refresh module registry
	 */
	static async refreshModuleRegistry(
		req: Request,
		res: Response
	): Promise<void> {
		try {
			logger.info("🔄 Refreshing module registry", {
				category: LogCategory.MODULE,
				component: 'TerraformController',
				operation: 'refreshModuleRegistry',
				requestId: (req as any).id
			});

			await ModuleRegistryService.refresh();
			const modules = await ModuleRegistryService.getAvailableModules();

			const response = ResponseView.success(
				{
					modulesLoaded: modules.length,
					categories: [...new Set(modules.map((m) => m.category))],
				},
				"Module registry refreshed successfully"
			);

			res.json(response);
		} catch (error) {
			logger.error("❌ Error refreshing module registry", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.MODULE,
				component: 'TerraformController',
				operation: 'refreshModuleRegistry',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error(
				"Failed to refresh module registry",
				error instanceof Error ? error.message : "Unknown error"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Get list of generated Terraform files
	 */
	static async getTerraformFiles(req: Request, res: Response): Promise<void> {
		try {
			const files = await FileService.getTerraformFiles();
			const response = ResponseView.terraformFilesList(files);
			res.json(response);
		} catch (error) {
			logger.error("❌ Error listing terraform files", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
				component: 'TerraformController',
				operation: 'listTerraformFiles',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error(
				"Failed to list terraform files"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Get content of a specific Terraform file
	 */
	static async getTerraformFileContent(
		req: Request,
		res: Response
	): Promise<void> {
		try {
			const { filename } = req.params;
			const { projectId } = req.query as { projectId?: string };
			const content = await FileService.getTerraformFileContent(
				filename,
				projectId
			);

			if (!content) {
				const errorResponse = ResponseView.error("Terraform file not found");
				res.status(404).json(errorResponse);
				return;
			}

			const response = ResponseView.terraformFileContent(filename, content);
			res.json(response);
		} catch (error) {
			logger.error("❌ Error reading terraform file", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
				component: 'TerraformController',
				operation: 'readTerraformFile',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error("Failed to read terraform file");
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Download Terraform file as attachment
	 */
	static async downloadTerraformFile(
		req: Request,
		res: Response
	): Promise<void> {
		try {
			const { filename } = req.params;
			const { projectId } = req.query as { projectId?: string };
			const filePath = await FileService.getTerraformFilePath(
				filename,
				projectId
			);

			if (!filePath) {
				const errorResponse = ResponseView.error("Terraform file not found");
				res.status(404).json(errorResponse);
				return;
			}

			res.download(filePath, filename);
		} catch (error) {
			logger.error("❌ Error downloading terraform file", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
				component: 'TerraformController',
				operation: 'downloadTerraformFile',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error(
				"Failed to download terraform file"
			);
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
				const errorResponse = ResponseView.error(
					"Project not found or no files available"
				);
				res.status(404).json(errorResponse);
				return;
			}

			// Set appropriate headers for ZIP file download
			res.setHeader("Content-Type", "application/zip");
			res.setHeader(
				"Content-Disposition",
				`attachment; filename="${projectName}-terraform.zip"`
			);
			res.setHeader("Content-Length", zipBuffer.length);

			res.send(zipBuffer);
		} catch (error) {
			logger.error("❌ Error creating project ZIP", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
				component: 'TerraformController',
				operation: 'createProjectZip',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error(
				"Failed to create project ZIP file"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Get list of available projects
	 */
	static async getProjects(req: Request, res: Response): Promise<void> {
		try {
			const projects = await FileService.getAvailableProjects();
			const response = ResponseView.projectsList(projects);
			res.json(response);
		} catch (error) {
			logger.error("❌ Error listing projects", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
				component: 'TerraformController',
				operation: 'listProjects',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error("Failed to list projects");
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Get files in a specific project
	 */
	static async getProjectFiles(req: Request, res: Response): Promise<void> {
		try {
			const { projectName } = req.params;
			const files = await FileService.getProjectFiles(projectName);

			if (files.length === 0) {
				const errorResponse = ResponseView.error(
					"Project not found or no files available"
				);
				res.status(404).json(errorResponse);
				return;
			}

			const response = ResponseView.terraformFilesList(files);
			res.json(response);
		} catch (error) {
			logger.error("❌ Error listing project files", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
				component: 'TerraformController',
				operation: 'listProjectFiles',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error("Failed to list project files");
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
		const dependencyMap = new Map(dependencies.map((d) => [d.moduleId, d]));

		return {
			nodes: nodes.map((node) => ({
				id: node.id,
				name: node.name,
				type: node.resourceType,
				module: node.terraformModule,
				level: dependencyMap.get(node.id)?.level || 0,
			})),
			edges: dependencies.flatMap((dep) =>
				dep.dependsOn.map((source: string) => ({
					source,
					target: dep.moduleId,
					type: "dependency",
				}))
			),
		};
	}

	/**
	 * Generate resource summary for plan preview
	 */
	private static generateResourceSummary(modules: any[]): any {
		const summary = {
			totalResources: 0,
			resourceTypes: {} as Record<string, number>,
			modules: modules.length,
		};

		for (const module of modules) {
			summary.totalResources++;
			const category = module.source.split("/")[2]; // Extract category from path
			summary.resourceTypes[category] =
				(summary.resourceTypes[category] || 0) + 1;
		}

		return summary;
	}

	/**
	 * Generate basic cost estimate
	 */
	private static generateCostEstimate(modules: any[]): any {
		// Basic cost estimation - in production, integrate with AWS Pricing API
		const baseCosts: Record<string, number> = {
			vpc: 0,
			subnet: 0,
			ec2: 15, // t3.micro monthly
			"security-group": 0,
			s3: 5, // estimated monthly
			rds: 25, // db.t3.micro monthly
		};

		let totalEstimate = 0;
		const breakdown: Record<string, number> = {};

		for (const module of modules) {
			const moduleName = module.source.split("/").pop();
			const cost = baseCosts[moduleName] || 0;
			totalEstimate += cost;
			breakdown[moduleName] = (breakdown[moduleName] || 0) + cost;
		}

		return {
			monthlyEstimate: totalEstimate,
			breakdown,
			currency: "USD",
			disclaimer:
				"This is a rough estimate. Actual costs may vary based on usage and AWS pricing changes.",
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
			data.nodes.some(
				(node: any) =>
					node.nodeType &&
					(node.nodeType === "awsService" ||
						node.nodeType === "awsContainer") &&
					node.resourceType &&
					node.resourceType.startsWith("aws-")
			)
		);
	}

	/**
	 * Get project workspace structure
	 */
	static async getProjectStructure(req: Request, res: Response): Promise<void> {
		try {
			const { projectName } = req.params;
			const structure = await FileService.getProjectStructure(projectName);

			if (!structure) {
				const errorResponse = ResponseView.error("Project not found");
				res.status(404).json(errorResponse);
				return;
			}

			const response = ResponseView.success(
				{
					projectName,
					structure,
				},
				"Project structure retrieved successfully"
			);
			res.json(response);
		} catch (error) {
			logger.error("❌ Error getting project structure", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
				component: 'TerraformController',
				operation: 'getProjectStructure',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error(
				"Failed to get project structure"
			);
			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Delete a project
	 */
	static async deleteProject(req: Request, res: Response): Promise<void> {
		try {
			const { projectName } = req.params;
			const deleted = await FileService.deleteProject(projectName);

			if (!deleted) {
				const errorResponse = ResponseView.error(
					"Project not found or could not be deleted"
				);
				res.status(404).json(errorResponse);
				return;
			}

			const response = ResponseView.success(
				{
					projectName,
					deleted: true,
				},
				"Project deleted successfully"
			);
			res.json(response);
		} catch (error) {
			logger.error("❌ Error deleting project", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
				component: 'TerraformController',
				operation: 'deleteProject',
				requestId: (req as any).id
			});
			const errorResponse = ResponseView.error("Failed to delete project");
			res.status(500).json(errorResponse);
		}
	}
}
