import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { TerraformFile } from '../models/Architecture.js';
import { TerraformGenerationResult } from './ModularTerraformGeneratorService.js';
import { LocalFileManager } from './LocalFileManager.js';

export class FileService {
  private static fileManager = new LocalFileManager('./src/output');
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

    return allFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get content of a specific Terraform file (Legacy compatibility)
   */
  static async getTerraformFileContent(filename: string, projectId?: string): Promise<string | null> {
    await this.ensureInitialized();

    if (projectId) {
      // Get file from specific project
      return this.fileManager.getFileContent(projectId, filename);
    }

    // Legacy behavior: search in all projects
    const projects = this.fileManager.getUserProjects();
    for (const project of projects) {
      const content = this.fileManager.getFileContent(project.projectId, filename);
      if (content) {
        return content;
      }
    }

    return null;
  }

  /**
   * Get file path for download (Legacy compatibility)
   */
  static async getTerraformFilePath(filename: string, projectId?: string): Promise<string | null> {
    await this.ensureInitialized();

    if (projectId) {
      // Get file from specific project
      return this.fileManager.getFilePath(projectId, filename);
    }

    // Legacy behavior: search in all projects
    const projects = this.fileManager.getUserProjects();
    for (const project of projects) {
      const filePath = this.fileManager.getFilePath(project.projectId, filename);
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
    projectName: string = 'infrastructure'
  ): Promise<{ projectDir: string; files: string[] }> {
    await this.ensureInitialized();

    console.log('💾 Saving generated Terraform files...');

    // Create project with timestamp for uniqueness
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueProjectId = `${projectName}-${timestamp}`;

    // Convert TerraformGenerationResult files to Record<string, string>
    const terraformFiles: Record<string, string> = {};
    for (const file of terraformResult.files) {
      terraformFiles[file.filename] = file.content;
    }

    // Create project using LocalFileManager
    const projectInfo = await this.fileManager.createUserProject(uniqueProjectId, terraformFiles);

    console.log(`✅ Saved ${terraformResult.files.length} Terraform files to ${projectInfo.projectPath}`);

    return {
      projectDir: projectInfo.projectPath,
      files: terraformResult.files.map(f => f.filename)
    };
  }

  /**
   * Get list of available projects
   */
  static async getAvailableProjects(): Promise<Array<{
    name: string;
    path: string;
    fileCount: number;
    createdAt: string;
    modifiedAt: string;
    size: number;
    hasState?: boolean;
    hasTerraformDir?: boolean;
  }>> {
    await this.ensureInitialized();

    const projects = this.fileManager.getUserProjects();
    return projects.map(project => ({
      name: project.projectId,
      path: project.projectPath,
      fileCount: project.fileCount,
      createdAt: project.createdAt,
      modifiedAt: project.modifiedAt,
      size: project.size,
      hasState: project.hasState,
      hasTerraformDir: project.hasTerraformDir
    }));
  }

  /**
   * Create a ZIP archive of all Terraform files in a project
   */
  static async createProjectZip(projectName: string): Promise<Buffer | null> {
    await this.ensureInitialized();

    const projectStructure = this.fileManager.getWorkspaceStructure(projectName);

    if (!projectStructure || projectStructure.generatedFiles.length === 0) {
      return null;
    }

    const generatedPath = this.fileManager.getGeneratedPath('sudo', projectName);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Add all .tf files from the generated directory
      projectStructure.generatedFiles.forEach(file => {
        const filePath = path.join(generatedPath, file);
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
}
