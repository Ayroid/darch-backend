import fs from 'fs';
import path from 'path';

export interface UserProjectInfo {
  userId: string;
  projectId: string;
  projectPath: string;
  generatedPath: string;
  statePath: string;
  terraformPath: string;
}

export interface TerraformWorkspaceStructure {
  projectPath: string;
  generatedFiles: string[];
  hasState: boolean;
  hasTerraformDir: boolean;
}

export class LocalFileManager {
  private baseDir: string;
  private readonly ROOT_USER_ID = 'sudo';

  constructor(baseDir: string = './src/output') {
    this.baseDir = path.resolve(baseDir);
  }

  /**
   * Get the full path for a user's project
   */
  getUserProjectPath(userId: string = this.ROOT_USER_ID, projectId: string): string {
    return path.join(this.baseDir, 'users', userId, projectId);
  }

  /**
   * Get the generated files path for a project
   */
  getGeneratedPath(userId: string = this.ROOT_USER_ID, projectId: string): string {
    return path.join(this.getUserProjectPath(userId, projectId), 'generated');
  }

  /**
   * Get the state path for a project
   */
  getStatePath(userId: string = this.ROOT_USER_ID, projectId: string): string {
    return path.join(this.getUserProjectPath(userId, projectId), 'state');
  }

  /**
   * Get the terraform directory path for a project
   */
  getTerraformPath(userId: string = this.ROOT_USER_ID, projectId: string): string {
    return path.join(this.getUserProjectPath(userId, projectId), '.terraform');
  }

  /**
   * Create a new user project with the required directory structure
   */
  async createUserProject(
    projectId: string,
    terraformFiles: Record<string, string>,
    userId: string = this.ROOT_USER_ID
  ): Promise<UserProjectInfo> {
    const projectPath = this.getUserProjectPath(userId, projectId);
    const generatedPath = this.getGeneratedPath(userId, projectId);
    const statePath = this.getStatePath(userId, projectId);
    const terraformPath = this.getTerraformPath(userId, projectId);

    // Create project directory structure
    await fs.promises.mkdir(projectPath, { recursive: true });
    await fs.promises.mkdir(generatedPath, { recursive: true });
    await fs.promises.mkdir(statePath, { recursive: true });
    await fs.promises.mkdir(terraformPath, { recursive: true });

    console.log(`📁 Created project structure: ${projectPath}`);

    // Write terraform files to the generated directory
    for (const [filename, content] of Object.entries(terraformFiles)) {
      const filePath = path.join(generatedPath, filename);
      await fs.promises.writeFile(filePath, content);
      console.log(`💾 Saved: ${filename}`);
    }

    return {
      userId,
      projectId,
      projectPath,
      generatedPath,
      statePath,
      terraformPath
    };
  }

  /**
   * Check if a project exists for a user
   */
  projectExists(projectId: string, userId: string = this.ROOT_USER_ID): boolean {
    const projectPath = this.getUserProjectPath(userId, projectId);
    return fs.existsSync(projectPath);
  }

  /**
   * Get all projects for a user
   */
  getUserProjects(userId: string = this.ROOT_USER_ID): Array<{
    projectId: string;
    projectPath: string;
    fileCount: number;
    createdAt: string;
    modifiedAt: string;
    size: number;
    hasState: boolean;
    hasTerraformDir: boolean;
  }> {
    const userPath = path.join(this.baseDir, 'users', userId);

    if (!fs.existsSync(userPath)) {
      return [];
    }

    return fs.readdirSync(userPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const projectPath = path.join(userPath, dirent.name);
        const generatedPath = path.join(projectPath, 'generated');
        const statePath = path.join(projectPath, 'state');
        const terraformPath = path.join(projectPath, '.terraform');

        const stats = fs.statSync(projectPath);

        // Count terraform files in generated directory
        let fileCount = 0;
        let totalSize = 0;

        if (fs.existsSync(generatedPath)) {
          const files = fs.readdirSync(generatedPath).filter(file => file.endsWith('.tf'));
          fileCount = files.length;

          // Calculate total size of generated files
          totalSize = files.reduce((size, file) => {
            const filePath = path.join(generatedPath, file);
            return size + fs.statSync(filePath).size;
          }, 0);
        }

        return {
          projectId: dirent.name,
          projectPath: path.relative(process.cwd(), projectPath),
          fileCount,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
          size: totalSize,
          hasState: fs.existsSync(statePath) && fs.readdirSync(statePath).length > 0,
          hasTerraformDir: fs.existsSync(terraformPath)
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get all users
   */
  getAllUsers(): string[] {
    const usersPath = path.join(this.baseDir, 'users');

    if (!fs.existsSync(usersPath)) {
      return [];
    }

    return fs.readdirSync(usersPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .sort();
  }

  /**
   * Get project files from the generated directory
   */
  getProjectFiles(projectId: string, userId: string = this.ROOT_USER_ID): Array<{
    name: string;
    path: string;
    size: number;
    createdAt: string;
    modifiedAt: string;
  }> {
    const generatedPath = this.getGeneratedPath(userId, projectId);

    if (!fs.existsSync(generatedPath)) {
      return [];
    }

    return fs.readdirSync(generatedPath)
      .filter(file => file.endsWith('.tf'))
      .map(file => {
        const filePath = path.join(generatedPath, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: path.relative(process.cwd(), filePath),
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get file content from generated directory
   */
  getFileContent(projectId: string, filename: string, userId: string = this.ROOT_USER_ID): string | null {
    const generatedPath = this.getGeneratedPath(userId, projectId);
    const filePath = path.join(generatedPath, filename);

    if (!fs.existsSync(filePath) || !filename.endsWith('.tf')) {
      return null;
    }

    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Get file path for download
   */
  getFilePath(projectId: string, filename: string, userId: string = this.ROOT_USER_ID): string | null {
    const generatedPath = this.getGeneratedPath(userId, projectId);
    const filePath = path.join(generatedPath, filename);

    if (!fs.existsSync(filePath) || !filename.endsWith('.tf')) {
      return null;
    }

    return filePath;
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string, userId: string = this.ROOT_USER_ID): Promise<boolean> {
    const projectPath = this.getUserProjectPath(userId, projectId);

    if (!fs.existsSync(projectPath)) {
      return false;
    }

    try {
      await fs.promises.rmdir(projectPath, { recursive: true });
      console.log(`🗑️ Deleted project: ${projectPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting project ${projectId}:`, error);
      return false;
    }
  }

  /**
   * Get workspace structure information
   */
  getWorkspaceStructure(projectId: string, userId: string = this.ROOT_USER_ID): TerraformWorkspaceStructure | null {
    const projectPath = this.getUserProjectPath(userId, projectId);
    const generatedPath = this.getGeneratedPath(userId, projectId);
    const statePath = this.getStatePath(userId, projectId);
    const terraformPath = this.getTerraformPath(userId, projectId);

    if (!fs.existsSync(projectPath)) {
      return null;
    }

    const generatedFiles = fs.existsSync(generatedPath)
      ? fs.readdirSync(generatedPath).filter(file => file.endsWith('.tf'))
      : [];

    return {
      projectPath: path.relative(process.cwd(), projectPath),
      generatedFiles,
      hasState: fs.existsSync(statePath) && fs.readdirSync(statePath).length > 0,
      hasTerraformDir: fs.existsSync(terraformPath)
    };
  }

  /**
   * Initialize the workspace base directory
   */
  async initializeWorkspace(): Promise<void> {
    const usersPath = path.join(this.baseDir, 'users');
    const rootUserPath = path.join(usersPath, this.ROOT_USER_ID);

    // Create base directories
    await fs.promises.mkdir(usersPath, { recursive: true });
    await fs.promises.mkdir(rootUserPath, { recursive: true });

    console.log(`🚀 Initialized workspace structure at: ${this.baseDir}`);
  }


}
