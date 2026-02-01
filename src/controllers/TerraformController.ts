/**
 * TerraformController - Handles all Terraform-related API endpoints
 *
 * This controller provides endpoints for:
 * - Generating Terraform configurations from architecture diagrams
 * - Validating architecture data
 * - Running Terraform plan/apply/destroy operations
 * - Managing generated files and projects
 */

import { Request, Response } from "express";
import { ArchitectureData } from "../models/Architecture.js";
import { ArchitectureNormalizerService } from "../services/ArchitectureNormalizerService.js";
import { SimplifiedTerraformGeneratorService } from "../services/SimplifiedTerraformGeneratorService.js";
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
	 * Uses 3-stage optimized flow: Normalize → Generate → Persist
	 */
	static async generateModularTerraform(
		req: RequestWithId,
		res: Response
	): Promise<void> {
		const startTime = Date.now();
		let projectName = "infrastructure";

		try {
			const {
				architectureData,
				projectName: reqProjectName = "infrastructure",
			}: {
				architectureData: ArchitectureData;
				projectName?: string;
			} = req.body;

			projectName = reqProjectName;

			logger.terraform(LogLevel.INFO, "Generating Terraform configuration", {
				requestId: req.requestId,
				projectName,
				resourcesCount: architectureData?.resources?.length || 0,
				connectionsCount: architectureData?.connections?.length || 0,
			});

			if (!architectureData) {
				logger.validation(LogLevel.WARN, "Architecture data required", {
					requestId: req.requestId,
				});
				res.status(400).json(ResponseView.error("Architecture data is required"));
				return;
			}

			// STAGE 1: Unified Architecture Normalization
			// - Auto-detects format (frontend/backend)
			// - Single-pass resource normalization
			// - Builds dependency graph once
			// - Pre-computes module references
			// - Validates architecture
			const normalizationResult = await ArchitectureNormalizerService.normalizeArchitecture(
				architectureData,
				projectName
			);

			const { architecture, warnings: normWarnings, errors: normErrors } = normalizationResult;

			if (normErrors.length > 0) {
				res.status(400).json(ResponseView.error(
					"Architecture normalization failed",
					normErrors.join("; ")
				));
				return;
			}

			if (!architecture.validation.valid) {
				res.status(400).json(ResponseView.error(
					"Architecture validation failed",
					architecture.validation.errors.map(e => e.message).join("; ")
				));
				return;
			}

			logger.architecture(LogLevel.INFO, "Normalization completed", {
				requestId: req.requestId,
				resources: architecture.resources.length,
				connections: architecture.connections.length,
				warnings: normWarnings.length,
			});

			// STAGE 2: Direct Terraform Generation
			// - Uses pre-computed module references
			// - Generates all .tf files in single pass
			const terraformResult = await SimplifiedTerraformGeneratorService.generateTerraformConfiguration(
				architecture,
				projectName
			);

			logger.terraform(LogLevel.INFO, "Terraform generation completed", {
				requestId: req.requestId,
				mainTfLength: terraformResult.mainTf.length,
				filesGenerated: terraformResult.files.length,
			});

			// STAGE 3: File Persistence
			const savedFiles = await FileService.saveGeneratedTerraformFiles(
				terraformResult,
				projectName
			);

			// Validate generated Terraform syntax
			const validationResult = SimplifiedTerraformGeneratorService.validateTerraformSyntax(
				terraformResult.mainTf
			);

			const duration = Date.now() - startTime;

			res.json(ResponseView.success(
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
						valid: architecture.validation.valid,
						errorCount: architecture.validation.errors.length,
						warningCount: architecture.validation.warnings.length,
					},
					moduleMapping: {
						modulesGenerated: architecture.resources.length,
						dependencies: architecture.dependencyOrder.length,
						warnings: normWarnings,
					},
					performance: {
						durationMs: duration,
					},
					status: "success",
				},
				"Terraform configuration generated successfully"
			));

		} catch (error) {
			const duration = Date.now() - startTime;
			logger.error("Error generating Terraform", {
				requestId: req.requestId,
				projectName,
				error: error instanceof Error ? error.message : String(error),
				duration,
				category: LogCategory.TERRAFORM,
			});

			res.status(500).json(ResponseView.error(
				"Failed to generate Terraform configuration",
				error instanceof Error ? error.message : "Unknown error"
			));
		}
	}

	/**
	 * Validate architecture design before generation
	 */
	static async validateArchitecture(
		req: RequestWithId,
		res: Response
	): Promise<void> {
		try {
			const { architectureData }: { architectureData: ArchitectureData } = req.body;

			logger.validation(LogLevel.INFO, "Validating architecture", {
				requestId: req.requestId,
			});

			if (!architectureData) {
				logger.validation(LogLevel.WARN, "Architecture data required", {
					requestId: req.requestId,
				});
				res.status(400).json(ResponseView.error("Architecture data is required"));
				return;
			}

			const normalizationResult = await ArchitectureNormalizerService.normalizeArchitecture(
				architectureData,
				"validation"
			);

			res.json(ResponseView.success(
				{
					validation: normalizationResult.architecture.validation,
					resources: normalizationResult.architecture.resources.length,
					connections: normalizationResult.architecture.connections.length,
					metadata: normalizationResult.architecture.metadata,
					warnings: normalizationResult.warnings,
				},
				"Architecture validation completed"
			));

		} catch (error) {
			logger.error("Error validating architecture", {
				requestId: req.requestId,
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.VALIDATION,
			});

			res.status(500).json(ResponseView.error(
				"Failed to validate architecture",
				error instanceof Error ? error.message : "Unknown error"
			));
		}
	}

	/**
	 * Validate dependencies in architecture
	 */
	static async validateDependencies(
		req: RequestWithId,
		res: Response
	): Promise<void> {
		try {
			const { architectureData }: { architectureData: ArchitectureData } = req.body;

			if (!architectureData) {
				res.status(400).json(ResponseView.error("Architecture data is required"));
				return;
			}

			logger.validation(LogLevel.INFO, "Validating dependencies", {
				requestId: req.requestId,
			});

			const normalizationResult = await ArchitectureNormalizerService.normalizeArchitecture(
				architectureData,
				"dependency-validation"
			);

			const { architecture } = normalizationResult;

			// Build dependency visualization
			const dependencyGraph = this.buildDependencyVisualization(architecture);

			res.json(ResponseView.success(
				{
					dependencyGraph,
					circularDependencies: architecture.validation.errors
						.filter(e => e.type === "invalid_dependency")
						.map(e => e.message),
					dependencyOrder: architecture.dependencyOrder,
					resourceCount: architecture.resources.length,
				},
				"Dependency validation completed"
			));

		} catch (error) {
			logger.error("Error validating dependencies", {
				requestId: req.requestId,
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.VALIDATION,
			});

			res.status(500).json(ResponseView.error(
				"Failed to validate dependencies",
				error instanceof Error ? error.message : "Unknown error"
			));
		}
	}

	/**
	 * Get available Terraform modules
	 */
	static async getAvailableModules(req: RequestWithId, res: Response): Promise<void> {
		try {
			logger.module(LogLevel.INFO, "Fetching available modules", {
				requestId: req.requestId,
			});

			const modules = await ModuleRegistryService.getAvailableModules();
			const modulesByCategory = modules.reduce((acc, module) => {
				if (!acc[module.category]) {
					acc[module.category] = [];
				}
				acc[module.category].push(module);
				return acc;
			}, {} as Record<string, any[]>);

			res.json(ResponseView.success(
				{
					modules,
					modulesByCategory,
					totalModules: modules.length,
					categories: Object.keys(modulesByCategory),
				},
				"Available modules retrieved successfully"
			));

		} catch (error) {
			logger.error("Error fetching modules", {
				requestId: req.requestId,
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.MODULE,
			});

			res.status(500).json(ResponseView.error(
				"Failed to fetch available modules",
				error instanceof Error ? error.message : "Unknown error"
			));
		}
	}

	/**
	 * Get specific module details
	 */
	static async getModuleDetails(req: RequestWithId, res: Response): Promise<void> {
		try {
			const { category, name } = req.params;

			if (!category || !name) {
				res.status(400).json(ResponseView.error("Category and name are required"));
				return;
			}

			logger.module(LogLevel.INFO, "Fetching module details", {
				requestId: req.requestId,
				module: `${category}/${name}`,
			});

			const module = await ModuleRegistryService.getModule(category, name);
			if (!module) {
				res.status(404).json(ResponseView.error(`Module ${category}/${name} not found`));
				return;
			}

			const metadata = await ModuleRegistryService.getModuleMetadata(category, name);

			res.json(ResponseView.success(
				{ module, metadata },
				"Module details retrieved successfully"
			));

		} catch (error) {
			logger.error("Error fetching module details", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.MODULE,
			});

			res.status(500).json(ResponseView.error(
				"Failed to fetch module details",
				error instanceof Error ? error.message : "Unknown error"
			));
		}
	}

	/**
	 * Validate module configuration
	 */
	static async validateModuleConfiguration(req: Request, res: Response): Promise<void> {
		try {
			const { category, name, configuration } = req.body;

			if (!category || !name || !configuration) {
				res.status(400).json(ResponseView.error("Category, name, and configuration are required"));
				return;
			}

			logger.info(`Validating module configuration: ${category}/${name}`, {
				category: LogCategory.VALIDATION,
			});

			const validation = await ModuleRegistryService.validateModuleConfiguration(
				category,
				name,
				configuration
			);

			res.json(ResponseView.success(
				{ validation, module: `${category}/${name}`, configuration },
				"Module configuration validation completed"
			));

		} catch (error) {
			logger.error("Error validating module configuration", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.VALIDATION,
			});

			res.status(500).json(ResponseView.error(
				"Failed to validate module configuration",
				error instanceof Error ? error.message : "Unknown error"
			));
		}
	}

	/**
	 * Generate Terraform plan with actual terraform execution
	 */
	static async generateTerraformPlan(req: Request, res: Response): Promise<void> {
		try {
			const {
				architectureData,
				projectName = "infrastructure",
			}: {
				architectureData: ArchitectureData;
				projectName?: string;
			} = req.body;

			if (!architectureData) {
				res.status(400).json(ResponseView.error("Architecture data is required"));
				return;
			}

			logger.info(`Starting Terraform plan: ${projectName}`, {
				category: LogCategory.TERRAFORM,
				projectName,
			});

			// Check if project exists
			const existingProjectPath = await FileService.getProjectPath(projectName);
			const latestVersionId = await FileService.getLatestProjectVersion(projectName);

			if (!existingProjectPath || !latestVersionId) {
				const projects = await FileService.getAvailableProjects();
				res.status(404).json(ResponseView.error(
					`Project '${projectName}' not found. Please generate Terraform files first.`,
					`Available projects: ${projects.map(p => p.name).join(", ")}`
				));
				return;
			}

			// Validate project has necessary files
			const hasMainTf = await FileService.projectFileExists(projectName, "main.tf");
			if (!hasMainTf) {
				res.status(400).json(ResponseView.error(
					`Project '${projectName}' is missing required Terraform files. Please regenerate the project.`
				));
				return;
			}

			// Normalize architecture data for execution
			const normResult = await ArchitectureNormalizerService.normalizeArchitecture(
				architectureData,
				projectName
			);

			if (normResult.errors.length > 0) {
				res.status(400).json(ResponseView.error(
					"Architecture normalization failed",
					normResult.errors.join("; ")
				));
				return;
			}

			// Start async terraform plan execution
			const jobId = await TerraformExecutionService.startTerraformPlan(
				existingProjectPath,
				architectureData,
				projectName
			);

			res.json(ResponseView.success(
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
			));

		} catch (error) {
			logger.error("Error starting Terraform plan", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
			});

			res.status(500).json(ResponseView.error(
				"Failed to start Terraform plan execution",
				error instanceof Error ? error.message : "Unknown error"
			));
		}
	}

	/**
	 * Get terraform plan job status (polling endpoint)
	 */
	static async getTerraformPlanStatus(req: Request, res: Response): Promise<void> {
		try {
			const { jobId } = req.params;

			if (!jobId) {
				res.status(400).json(ResponseView.error("Job ID is required"));
				return;
			}

			const jobStatus = TerraformExecutionService.getJobStatus(jobId);

			if (!jobStatus) {
				res.status(404).json(ResponseView.error("Job not found"));
				return;
			}

			res.json(ResponseView.success(
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
			));

		} catch (error) {
			logger.error("Error getting plan status", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
			});

			res.status(500).json(ResponseView.error(
				"Failed to get plan status",
				error instanceof Error ? error.message : "Unknown error"
			));
		}
	}

	/**
	 * Get all terraform plan jobs
	 */
	static async getAllTerraformPlanJobs(req: Request, res: Response): Promise<void> {
		try {
			const jobs = TerraformExecutionService.getAllJobs();

			res.json(ResponseView.success(
				{
					jobs: jobs.map(job => ({
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
			));

		} catch (error) {
			logger.error("Error getting plan jobs", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
			});

			res.status(500).json(ResponseView.error(
				"Failed to get plan jobs",
				error instanceof Error ? error.message : "Unknown error"
			));
		}
	}

	/**
	 * Delete completed terraform plan job
	 */
	static async deleteTerraformPlanJob(req: Request, res: Response): Promise<void> {
		try {
			const { jobId } = req.params;

			if (!jobId) {
				res.status(400).json(ResponseView.error("Job ID is required"));
				return;
			}

			const deleted = TerraformExecutionService.deleteJob(jobId);

			if (deleted) {
				res.json(ResponseView.success({ jobId, deleted: true }, "Job deleted successfully"));
			} else {
				res.status(404).json(ResponseView.error("Job not found or could not be deleted"));
			}

		} catch (error) {
			logger.error("Error deleting plan job", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
			});

			res.status(500).json(ResponseView.error(
				"Failed to delete plan job",
				error instanceof Error ? error.message : "Unknown error"
			));
		}
	}

	// =====================================
	// TERRAFORM APPLY ENDPOINTS
	// =====================================

	/**
	 * Apply Terraform infrastructure
	 */
	static async generateTerraformApply(req: Request, res: Response): Promise<void> {
		try {
			const {
				architectureData,
				projectName = "infrastructure",
			}: {
				architectureData: ArchitectureData;
				projectName?: string;
			} = req.body;

			if (!architectureData) {
				res.status(400).json(ResponseView.error("Architecture data is required"));
				return;
			}

			logger.info(`Starting Terraform apply: ${projectName}`, {
				category: LogCategory.TERRAFORM,
				projectName,
			});

			// Check if project exists
			const existingProjectPath = await FileService.getProjectPath(projectName);
			const latestVersionId = await FileService.getLatestProjectVersion(projectName);

			if (!existingProjectPath || !latestVersionId) {
				const projects = await FileService.getAvailableProjects();
				res.status(404).json(ResponseView.error(
					`Project '${projectName}' not found. Please generate Terraform files first.`,
					`Available projects: ${projects.map(p => p.name).join(", ")}`
				));
				return;
			}

			// Validate project has necessary files
			const hasMainTf = await FileService.projectFileExists(projectName, "main.tf");
			if (!hasMainTf) {
				res.status(400).json(ResponseView.error(
					`Project '${projectName}' is missing required Terraform files. Please regenerate the project.`
				));
				return;
			}

			// Start async terraform apply execution
			const jobId = await TerraformExecutionService.startTerraformApply(
				existingProjectPath,
				architectureData,
				projectName
			);

			res.json(ResponseView.success(
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
			));

		} catch (error) {
			logger.error("Error starting Terraform apply", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
			});

			res.status(500).json(ResponseView.error(
				"Failed to start Terraform apply execution",
				error instanceof Error ? error.message : "Unknown error"
			));
		}
	}

	/**
	 * Get terraform apply job status
	 */
	static async getTerraformApplyStatus(req: Request, res: Response): Promise<void> {
		try {
			const { jobId } = req.params;

			if (!jobId) {
				res.status(400).json(ResponseView.error("Job ID is required"));
				return;
			}

			const jobStatus = TerraformExecutionService.getJobStatus(jobId);

			if (!jobStatus) {
				res.status(404).json(ResponseView.error("Job not found"));
				return;
			}

			res.json(ResponseView.success(
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
			));

		} catch (error) {
			logger.error("Error getting apply status", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
			});

			res.status(500).json(ResponseView.error(
				"Failed to get apply status",
				error instanceof Error ? error.message : "Unknown error"
			));
		}
	}

	// =====================================
	// TERRAFORM DESTROY ENDPOINTS
	// =====================================

	/**
	 * Destroy Terraform infrastructure
	 */
	static async generateTerraformDestroy(req: Request, res: Response): Promise<void> {
		try {
			const {
				projectName = "infrastructure",
				confirmDestroy = false,
			}: {
				projectName?: string;
				confirmDestroy?: boolean;
			} = req.body;

			if (!confirmDestroy) {
				res.status(400).json(ResponseView.error(
					"Destroy confirmation is required. Set 'confirmDestroy: true' to proceed."
				));
				return;
			}

			logger.info(`Starting Terraform destroy: ${projectName}`, {
				category: LogCategory.TERRAFORM,
				projectName,
			});

			// Check if project exists
			const existingProjectPath = await FileService.getProjectPath(projectName);
			const latestVersionId = await FileService.getLatestProjectVersion(projectName);

			if (!existingProjectPath || !latestVersionId) {
				const projects = await FileService.getAvailableProjects();
				res.status(404).json(ResponseView.error(
					`Project '${projectName}' not found.`,
					`Available projects: ${projects.map(p => p.name).join(", ")}`
				));
				return;
			}

			// Validate project has necessary files
			const hasMainTf = await FileService.projectFileExists(projectName, "main.tf");
			if (!hasMainTf) {
				res.status(400).json(ResponseView.error(
					`Project '${projectName}' is missing required Terraform files.`
				));
				return;
			}

			// Start async terraform destroy execution
			const jobId = await TerraformExecutionService.startTerraformDestroy(
				existingProjectPath,
				projectName
			);

			res.json(ResponseView.success(
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
			));

		} catch (error) {
			logger.error("Error starting Terraform destroy", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
			});

			res.status(500).json(ResponseView.error(
				"Failed to start Terraform destroy execution",
				error instanceof Error ? error.message : "Unknown error"
			));
		}
	}

	/**
	 * Get terraform destroy job status
	 */
	static async getTerraformDestroyStatus(req: Request, res: Response): Promise<void> {
		try {
			const { jobId } = req.params;

			if (!jobId) {
				res.status(400).json(ResponseView.error("Job ID is required"));
				return;
			}

			const jobStatus = TerraformExecutionService.getJobStatus(jobId);

			if (!jobStatus) {
				res.status(404).json(ResponseView.error("Job not found"));
				return;
			}

			res.json(ResponseView.success(
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
			));

		} catch (error) {
			logger.error("Error getting destroy status", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.TERRAFORM,
			});

			res.status(500).json(ResponseView.error(
				"Failed to get destroy status",
				error instanceof Error ? error.message : "Unknown error"
			));
		}
	}

	// =====================================
	// MODULE REGISTRY ENDPOINTS
	// =====================================

	/**
	 * Refresh module registry
	 */
	static async refreshModuleRegistry(req: Request, res: Response): Promise<void> {
		try {
			logger.info("Refreshing module registry", { category: LogCategory.MODULE });

			await ModuleRegistryService.refresh();
			const modules = await ModuleRegistryService.getAvailableModules();

			res.json(ResponseView.success(
				{
					modulesLoaded: modules.length,
					categories: [...new Set(modules.map(m => m.category))],
				},
				"Module registry refreshed successfully"
			));

		} catch (error) {
			logger.error("Error refreshing module registry", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.MODULE,
			});

			res.status(500).json(ResponseView.error(
				"Failed to refresh module registry",
				error instanceof Error ? error.message : "Unknown error"
			));
		}
	}

	// =====================================
	// FILE MANAGEMENT ENDPOINTS
	// =====================================

	/**
	 * Get list of generated Terraform files
	 */
	static async getTerraformFiles(req: Request, res: Response): Promise<void> {
		try {
			const files = await FileService.getTerraformFiles();
			res.json(ResponseView.terraformFilesList(files));
		} catch (error) {
			logger.error("Error listing terraform files", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
			});
			res.status(500).json(ResponseView.error("Failed to list terraform files"));
		}
	}

	/**
	 * Get content of a specific Terraform file
	 */
	static async getTerraformFileContent(req: Request, res: Response): Promise<void> {
		try {
			const { filename } = req.params;
			const { projectId } = req.query as { projectId?: string };

			if (!projectId) {
				res.status(400).json(ResponseView.error("Project ID is required"));
				return;
			}

			const content = await FileService.getTerraformFileContent(filename, projectId);

			if (!content) {
				res.status(404).json(ResponseView.error("Terraform file not found"));
				return;
			}

			res.json(ResponseView.terraformFileContent(filename, content));
		} catch (error) {
			logger.error("Error reading terraform file", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
			});
			res.status(500).json(ResponseView.error("Failed to read terraform file"));
		}
	}

	/**
	 * Download Terraform file as attachment
	 */
	static async downloadTerraformFile(req: Request, res: Response): Promise<void> {
		try {
			const { filename } = req.params;
			const { projectId } = req.query as { projectId?: string };

			if (!projectId) {
				res.status(400).json(ResponseView.error("Project ID is required"));
				return;
			}

			const filePath = await FileService.getTerraformFilePath(filename, projectId);

			if (!filePath) {
				res.status(404).json(ResponseView.error("Terraform file not found"));
				return;
			}

			res.download(filePath, filename);
		} catch (error) {
			logger.error("Error downloading terraform file", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
			});
			res.status(500).json(ResponseView.error("Failed to download terraform file"));
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
				res.status(404).json(ResponseView.error("Project not found or no files available"));
				return;
			}

			res.setHeader("Content-Type", "application/zip");
			res.setHeader("Content-Disposition", `attachment; filename="${projectName}-terraform.zip"`);
			res.setHeader("Content-Length", zipBuffer.length);
			res.send(zipBuffer);
		} catch (error) {
			logger.error("Error creating project ZIP", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
			});
			res.status(500).json(ResponseView.error("Failed to create project ZIP file"));
		}
	}

	/**
	 * Get list of available projects
	 */
	static async getProjects(req: Request, res: Response): Promise<void> {
		try {
			const projects = await FileService.getAvailableProjects();
			res.json(ResponseView.projectsList(projects));
		} catch (error) {
			logger.error("Error listing projects", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
			});
			res.status(500).json(ResponseView.error("Failed to list projects"));
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
				res.status(404).json(ResponseView.error("Project not found or no files available"));
				return;
			}

			res.json(ResponseView.terraformFilesList(files));
		} catch (error) {
			logger.error("Error listing project files", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
			});
			res.status(500).json(ResponseView.error("Failed to list project files"));
		}
	}

	/**
	 * Get project workspace structure
	 */
	static async getProjectStructure(req: Request, res: Response): Promise<void> {
		try {
			const { projectName } = req.params;
			const structure = await FileService.getProjectStructure(projectName);

			if (!structure) {
				res.status(404).json(ResponseView.error("Project not found"));
				return;
			}

			res.json(ResponseView.success(
				{ projectName, structure },
				"Project structure retrieved successfully"
			));
		} catch (error) {
			logger.error("Error getting project structure", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
			});
			res.status(500).json(ResponseView.error("Failed to get project structure"));
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
				res.status(404).json(ResponseView.error("Project not found or could not be deleted"));
				return;
			}

			res.json(ResponseView.success(
				{ projectName, deleted: true },
				"Project deleted successfully"
			));
		} catch (error) {
			logger.error("Error deleting project", {
				error: error instanceof Error ? error.message : String(error),
				category: LogCategory.FILE,
			});
			res.status(500).json(ResponseView.error("Failed to delete project"));
		}
	}

	// =====================================
	// PRIVATE HELPER METHODS
	// =====================================

	/**
	 * Build dependency visualization data from normalized architecture
	 */
	private static buildDependencyVisualization(architecture: any): any {
		return {
			nodes: architecture.resources.map((resource: any) => ({
				id: resource.id,
				name: resource.name,
				type: resource.resourceType,
				module: resource.terraformModule,
				moduleName: resource.moduleName,
			})),
			edges: architecture.resources.flatMap((resource: any) =>
				resource.dependencies.map((depId: string) => ({
					source: depId,
					target: resource.id,
					type: "dependency",
				}))
			),
			order: architecture.dependencyOrder,
		};
	}
}
