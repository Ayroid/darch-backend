import fs from 'fs';
import path from 'path';
import { logger, LogCategory, LogLevel } from '../utils/Logger.js';
import archiver from "archiver";
import { TerraformFile } from "../models/Architecture.js";
import { TerraformGenerationResult } from "./ModularTerraformGeneratorService.js";
import { LocalFileManager } from "./LocalFileManager.js";

export class FileService {
	private static fileManager = new LocalFileManager("./src/output");
	private static initialized = false;

	/**
	 * Ensure workspace is initialized
	 */
	private static async ensureInitialized(): Promise<void> {
		if (!this.initialized) {
			await this.fileManager.initializeWorkspace();
			this.initialized = true;
		}
	}

	/**
	 * Get list of generated Terraform files (Legacy compatibility)
	 */
	static async getTerraformFiles(): Promise<TerraformFile[]> {
		await this.ensureInitialized();

		// Get all files from all projects for backward compatibility
		const projects = this.fileManager.getUserProjects();
		const allFiles: TerraformFile[] = [];

		for (const project of projects) {
			const projectFiles = this.fileManager.getProjectFiles(project.projectId);
			allFiles.push(...projectFiles);
		}

		return allFiles.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
	}

	/**
	 * Get content of a specific Terraform file (Legacy compatibility)
	 */
	static async getTerraformFileContent(
		filename: string,
		projectId?: string
	): Promise<string | null> {
		await this.ensureInitialized();

		if (projectId) {
			// Get file from specific project
			return this.fileManager.getFileContent(projectId, filename);
		}

		// Legacy behavior: search in all projects
		const projects = this.fileManager.getUserProjects();
		for (const project of projects) {
			const content = this.fileManager.getFileContent(
				project.projectId,
				filename
			);
			if (content) {
				return content;
			}
		}

		return null;
	}

	/**
	 * Get file path for download (Legacy compatibility)
	 */
	static async getTerraformFilePath(
		filename: string,
		projectId?: string
	): Promise<string | null> {
		await this.ensureInitialized();

		if (projectId) {
			// Get file from specific project
			return this.fileManager.getFilePath(projectId, filename);
		}

		// Legacy behavior: search in all projects
		const projects = this.fileManager.getUserProjects();
		for (const project of projects) {
			const filePath = this.fileManager.getFilePath(
				project.projectId,
				filename
			);
			if (filePath) {
				return filePath;
			}
		}

		return null;
	}

	/**
	 * Save generated Terraform files from modular generation
	 */
	static async saveGeneratedTerraformFiles(
		terraformResult: TerraformGenerationResult,
		projectName: string = "infrastructure"
	): Promise<{ projectDir: string; files: string[] }> {
		await this.ensureInitialized();

		// Create versioned project name
		const versionedProjectId = await this.getNextVersionedProjectName(
			projectName
		);

		// Convert TerraformGenerationResult files to Record<string, string>
		const terraformFiles: Record<string, string> = {};

		logger.file(LogLevel.INFO, '💾 Saving generated Terraform files', {
			projectName,
			versionedProjectId,
			fileCount: terraformResult.files.length,
			component: 'FileService',
			operation: 'saveTerraformFiles'
		});
		for (const file of terraformResult.files) {
			terraformFiles[file.filename] = file.content;
		}

		// Create project using LocalFileManager
		const projectInfo = await this.fileManager.createUserProject(
			versionedProjectId,
			terraformFiles
		);

		logger.file(LogLevel.INFO, '✅ Terraform files saved successfully', {
			projectName,
			versionedProjectId,
			fileCount: terraformResult.files.length,
			projectPath: projectInfo.projectPath,
			filenames: terraformResult.files.map((f) => f.filename),
			component: 'FileService'
		});

		return {
			projectDir: projectInfo.projectPath,
			files: terraformResult.files.map((f) => f.filename),
		};
	}

	/**
	 * Get list of available projects
	 */
	static async getAvailableProjects(): Promise<
		Array<{
			name: string;
			path: string;
			fileCount: number;
			createdAt: string;
			modifiedAt: string;
			size: number;
			hasState?: boolean;
			hasTerraformDir?: boolean;
		}>
	> {
		await this.ensureInitialized();

		const projects = this.fileManager.getUserProjects();
		return projects.map((project) => ({
			name: project.projectId,
			path: project.projectPath,
			fileCount: project.fileCount,
			createdAt: project.createdAt,
			modifiedAt: project.modifiedAt,
			size: project.size,
			hasState: project.hasState,
			hasTerraformDir: project.hasTerraformDir,
		}));
	}

	/**
	 * Create a ZIP archive of all Terraform files in a project
	 */
	static async createProjectZip(projectName: string): Promise<Buffer | null> {
		await this.ensureInitialized();

		const projectStructure =
			this.fileManager.getWorkspaceStructure(projectName);

		if (!projectStructure || projectStructure.generatedFiles.length === 0) {
			return null;
		}

		const projectPath = this.fileManager.getUserProjectPath(
			"sudo",
			projectName
		);

		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = [];
			const archive = archiver("zip", { zlib: { level: 9 } });

			archive.on("data", (chunk: Buffer) => chunks.push(chunk));
			archive.on("end", () => resolve(Buffer.concat(chunks)));
			archive.on("error", reject);

			// Add all .tf files from the project root directory
			projectStructure.generatedFiles.forEach((file) => {
				const filePath = path.join(projectPath, file);
				archive.file(filePath, { name: file });
			});

			archive.finalize();
		});
	}

	/**
	 * Get project files (for listing files in a specific project)
	 */
	static async getProjectFiles(projectName: string): Promise<TerraformFile[]> {
		await this.ensureInitialized();

		return this.fileManager.getProjectFiles(projectName);
	}

	/**
	 * Get workspace structure for a project
	 */
	static async getProjectStructure(projectName: string) {
		await this.ensureInitialized();

		return this.fileManager.getWorkspaceStructure(projectName);
	}

	/**
	 * Delete a project
	 */
	static async deleteProject(projectName: string): Promise<boolean> {
		await this.ensureInitialized();

		return this.fileManager.deleteProject(projectName);
	}

	/**
	 * Get the path of an existing project
	 */
	static async getProjectPath(projectName: string): Promise<string | null> {
		try {
			await this.ensureInitialized();

			const projects = this.fileManager.getUserProjects();

			// First try exact match
			let project = projects.find((p) => p.projectId === projectName);

			// If no exact match, try to find the latest version of the project
			if (!project) {
				const latestVersionId = await this.getLatestProjectVersion(projectName);
				if (latestVersionId) {
					project = projects.find((p) => p.projectId === latestVersionId);
				}
			}

			// If still no match using versioned approach, try legacy timestamp-based matching
			if (!project) {
				project = projects.find((p) =>
					p.projectId.startsWith(projectName + "-")
				);
			}

			if (project) {
				// Check if project directory still exists
				const projectExists = await fs.promises
					.access(project.projectPath)
					.then(() => true)
					.catch(() => false);
				return projectExists ? project.projectPath : null;
			}

			return null;
		} catch (error) {
			logger.error('Error checking project path', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				category: LogCategory.FILE,
				component: 'FileService'
			});
			return null;
		}
	}
	/**
	 * Check if a specific file exists in a project (uses latest version if base name provided)
	 */
	static async projectFileExists(
		projectName: string,
		filename: string
	): Promise<boolean> {
		try {
			await this.ensureInitialized();

			const projectPath = await this.getProjectPath(projectName);
			if (!projectPath) {
				return false;
			}

			const filePath = path.join(projectPath, filename);
			await fs.promises.access(filePath);
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Get base output directory
	 */
	static getBaseOutputDir(): string {
		return path.resolve("./src/output/users/sudo");
	}

	/**
	 * Get the next versioned project name (e.g., project1-version1, project1-version2)
	 */
	static async getNextVersionedProjectName(
		baseProjectName: string
	): Promise<string> {
		await this.ensureInitialized();

		const projects = this.fileManager.getUserProjects();
		const projectVersions = projects
			.map((p) => p.projectId)
			.filter((name) => name.startsWith(`${baseProjectName}-version`))
			.map((name) => {
				const versionMatch = name.match(/-version(\d+)$/);
				return versionMatch ? parseInt(versionMatch[1], 10) : 0;
			})
			.filter((version) => !isNaN(version));

		const nextVersion =
			projectVersions.length > 0 ? Math.max(...projectVersions) + 1 : 1;
		return `${baseProjectName}-version${nextVersion}`;
	}

	/**
	 * Get the latest version of a project (highest version number)
	 */
	static async getLatestProjectVersion(
		baseProjectName: string
	): Promise<string | null> {
		await this.ensureInitialized();

		const projects = this.fileManager.getUserProjects();
		const projectVersions = projects
			.filter((p) => p.projectId.startsWith(`${baseProjectName}-version`))
			.map((p) => ({
				projectId: p.projectId,
				version: (() => {
					const versionMatch = p.projectId.match(/-version(\d+)$/);
					return versionMatch ? parseInt(versionMatch[1], 10) : 0;
				})(),
			}))
			.filter((p) => !isNaN(p.version));

		if (projectVersions.length === 0) {
			return null;
		}

		const latestProject = projectVersions.reduce((latest, current) =>
			current.version > latest.version ? current : latest
		);

		return latestProject.projectId;
	}

	/**
	 * Get all versions of a project
	 */
	static async getProjectVersions(baseProjectName: string): Promise<
		Array<{
			projectId: string;
			version: number;
			path: string;
			createdAt: string;
		}>
	> {
		await this.ensureInitialized();

		const projects = this.fileManager.getUserProjects();
		const projectVersions = projects
			.filter((p) => p.projectId.startsWith(`${baseProjectName}-version`))
			.map((p) => {
				const versionMatch = p.projectId.match(/-version(\d+)$/);
				const version = versionMatch ? parseInt(versionMatch[1], 10) : 0;
				return {
					projectId: p.projectId,
					version,
					path: p.projectPath,
					createdAt: p.createdAt,
				};
			})
			.filter((p) => !isNaN(p.version))
			.sort((a, b) => b.version - a.version); // Sort by version descending (latest first)

		return projectVersions;
	}

	/**
	 * Migrate existing timestamp-based projects to versioned naming
	 * This is a utility method to clean up old projects
	 */
	static async migrateTimestampProjectsToVersioned(): Promise<void> {
		await this.ensureInitialized();

		const projects = this.fileManager.getUserProjects();

		// Group projects by base name (extract base name from timestamp projects)
		const baseProjectGroups = new Map<
			string,
			Array<{ projectId: string; projectPath: string; createdAt: string }>
		>();

		for (const project of projects) {
			const projectId = project.projectId;

			// Check if it's a timestamp-based project (contains ISO date format)
			if (projectId.match(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/)) {
				const baseNameMatch = projectId.match(
					/^(.+)-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/
				);
				if (baseNameMatch) {
					const baseName = baseNameMatch[1];
					if (!baseProjectGroups.has(baseName)) {
						baseProjectGroups.set(baseName, []);
					}
					baseProjectGroups.get(baseName)!.push({
						projectId: project.projectId,
						projectPath: project.projectPath,
						createdAt: project.createdAt,
					});
				}
			}
		}

		logger.file(LogLevel.INFO, '🔄 Found project groups to migrate', {
			projectGroupsCount: baseProjectGroups.size,
			component: 'FileService',
			operation: 'migrateTimestampProjectsToVersioned'
		});

		// For each base project, create versioned projects
		for (const [baseName, timestampProjects] of baseProjectGroups) {
			// Sort by creation date (oldest first)
			timestampProjects.sort(
				(a, b) =>
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			);

			logger.file(LogLevel.INFO, '📦 Migrating project versions', {
				baseName,
				versionsCount: timestampProjects.length,
				component: 'FileService'
			});

			// Note: This is a read-only migration that shows what would happen
			// In a real implementation, you'd need to rename directories and update the LocalFileManager
			timestampProjects.forEach((project, index) => {
				const newVersionedName = `${baseName}-version${index + 1}`;

				logger.file(LogLevel.DEBUG, 'Project migration mapping', {
					oldName: project.projectId,
					newName: newVersionedName,
					baseName,
					version: index + 1,
					component: 'FileService'
				});
			});
		}
	}
}
