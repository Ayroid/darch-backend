import fs from 'fs';
import path from 'path';
import { TerraformGenerator } from '../terraform-generator.js';
import { TerraformFile, GeneratedTerraform } from '../models/Architecture.js';

export class FileService {
  private static outputDir = path.resolve('./src/output');

  /**
   * Generate Terraform file from configuration
   */
  static async generateTerraformFile(
    terraformConfig: any, 
    projectName: string = 'infrastructure'
  ): Promise<GeneratedTerraform> {
    console.log('🔄 Converted to Terraform config:', JSON.stringify(terraformConfig, null, 2));

    // Generate Terraform using the AST-based approach
    const generator = new TerraformGenerator(terraformConfig);
    const terraformCode = generator.generateTerraform();

    // Create output directory
    fs.mkdirSync(this.outputDir, { recursive: true });

    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${projectName}-${timestamp}.tf`;
    const outputPath = path.join(this.outputDir, filename);

    // Write terraform file
    fs.writeFileSync(outputPath, terraformCode);

    console.log(`✅ Terraform generated: ${filename}`);

    return {
      terraformCode,
      filename,
      outputPath: path.relative(process.cwd(), outputPath),
      generatedAt: new Date().toISOString()
    };
  }

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
}
