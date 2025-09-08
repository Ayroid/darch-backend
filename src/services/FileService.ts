import fs from 'fs';
import path from 'path';
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
}
