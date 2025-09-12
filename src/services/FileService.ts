import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { TerraformFile } from '../models/Architecture.js';
import { TerraformGenerationResult } from './ModularTerraformGeneratorService.js';

export class FileService {
  private static outputDir = path.resolve('./src/output');

  /**
   * Get list of generated Terraform files
   */
  static getTerraformFiles(): TerraformFile[] {
    if (!fs.existsSync(this.outputDir)) {
      return [];
    }

    return fs.readdirSync(this.outputDir)
      .filter(file => file.endsWith('.tf'))
      .map(file => {
        const filePath = path.join(this.outputDir, file);
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
   * Get content of a specific Terraform file
   */
  static getTerraformFileContent(filename: string): string | null {
    const filePath = path.join(this.outputDir, filename);

    if (!fs.existsSync(filePath) || !filename.endsWith('.tf')) {
      return null;
    }

    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Get file path for download
   */
  static getTerraformFilePath(filename: string): string | null {
    const filePath = path.join(this.outputDir, filename);

    if (!fs.existsSync(filePath) || !filename.endsWith('.tf')) {
      return null;
    }

    return filePath;
  }

  /**
   * Save generated Terraform files from modular generation
   */
  static async saveGeneratedTerraformFiles(
    terraformResult: TerraformGenerationResult,
    projectName: string = 'infrastructure'
  ): Promise<{ projectDir: string; files: string[] }> {
    console.log('💾 Saving generated Terraform files...');

    // Create project directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const projectDir = path.join(this.outputDir, `${projectName}-${timestamp}`);
    fs.mkdirSync(projectDir, { recursive: true });

    const savedFiles: string[] = [];

    // Save all generated files
    for (const file of terraformResult.files) {
      const filePath = path.join(projectDir, file.filename);
      fs.writeFileSync(filePath, file.content);
      savedFiles.push(file.filename);
      console.log(`📁 Saved: ${file.filename}`);
    }

    console.log(`✅ Saved ${savedFiles.length} Terraform files to ${projectDir}`);

    return {
      projectDir: path.relative(process.cwd(), projectDir),
      files: savedFiles
    };
  }

  /**
   * Get list of available projects (directories in output folder)
   */
  static getAvailableProjects(): Array<{
    name: string;
    path: string;
    fileCount: number;
    createdAt: string;
    modifiedAt: string;
    size: number;
  }> {
    if (!fs.existsSync(this.outputDir)) {
      return [];
    }

    return fs.readdirSync(this.outputDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const projectPath = path.join(this.outputDir, dirent.name);
        const stats = fs.statSync(projectPath);

        // Count terraform files in project
        const files = fs.readdirSync(projectPath).filter(file => file.endsWith('.tf'));

        // Calculate total size of all files
        const totalSize = files.reduce((size, file) => {
          const filePath = path.join(projectPath, file);
          return size + fs.statSync(filePath).size;
        }, 0);

        return {
          name: dirent.name,
          path: path.relative(process.cwd(), projectPath),
          fileCount: files.length,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
          size: totalSize
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Create a ZIP archive of all Terraform files in a project
   */
  static async createProjectZip(projectName: string): Promise<Buffer | null> {
    const projectPath = path.join(this.outputDir, projectName);

    if (!fs.existsSync(projectPath)) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Add all .tf files from the project directory
      const files = fs.readdirSync(projectPath).filter(file => file.endsWith('.tf'));

      if (files.length === 0) {
        resolve(null);
        return;
      }

      files.forEach(file => {
        const filePath = path.join(projectPath, file);
        archive.file(filePath, { name: file });
      });

      archive.finalize();
    });
  }

  /**
   * Get project files (for listing files in a specific project)
   */
  static getProjectFiles(projectName: string): TerraformFile[] {
    const projectPath = path.join(this.outputDir, projectName);

    if (!fs.existsSync(projectPath)) {
      return [];
    }

    return fs.readdirSync(projectPath)
      .filter(file => file.endsWith('.tf'))
      .map(file => {
        const filePath = path.join(projectPath, file);
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
}
