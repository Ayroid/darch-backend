import { Request, Response } from 'express';
import { TerraformConfigService } from '../services/TerraformConfigService.js';
import { FileService } from '../services/FileService.js';
import { ResponseView } from '../views/ResponseView.js';
import { ArchitectureData } from '../models/Architecture.js';

export class TerraformController {
  /**
   * Generate Terraform from raw JSON config (for testing and legacy support)
   */
  static async generateTerraformFromRawConfig(req: Request, res: Response): Promise<void> {
    try {
      const terraformConfig = req.body;
      const projectName = req.query.projectName as string || 'infrastructure';

      if (!terraformConfig || typeof terraformConfig !== 'object') {
        const errorResponse = ResponseView.error('Valid JSON configuration is required');
        res.status(400).json(errorResponse);
        return;
      }

      console.log('📝 Received raw terraform config:', JSON.stringify(terraformConfig, null, 2));

      // Generate Terraform file directly from config
      const result = await FileService.generateTerraformFile(terraformConfig, projectName);

      const response = ResponseView.terraformGenerated(result);
      res.json(response);

    } catch (error) {
      console.error('❌ Error generating Terraform from raw config:', error);
      const errorResponse = ResponseView.error(
        'Failed to generate Terraform configuration',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Generate Terraform from architecture data
   */
  static async generateTerraform(req: Request, res: Response): Promise<void> {
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

      console.log('📝 Received architecture data:', JSON.stringify(architectureData, null, 2));

      // Convert ArchitectureData to TerraformGenerator format
      const terraformConfig = TerraformConfigService.convertArchitectureDataToTerraformConfig(architectureData);

      // Generate Terraform file
      const result = await FileService.generateTerraformFile(terraformConfig, projectName);

      const response = ResponseView.terraformGenerated(result);
      res.json(response);

    } catch (error) {
      console.error('❌ Error generating Terraform:', error);
      const errorResponse = ResponseView.error(
        'Failed to generate Terraform configuration',
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
}
