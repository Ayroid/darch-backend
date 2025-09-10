import { ApiResponse, HealthCheckResponse } from '../models/Response.js';
import { GeneratedTerraform, TerraformFile } from '../models/Architecture.js';

export class ResponseView {
  /**
   * Format success response
   */
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format error response
   */
  static error(error: string, details?: string): ApiResponse {
    return {
      success: false,
      error,
      details,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format health check response
   */
  static healthCheck(): HealthCheckResponse {
    return {
      status: 'OK',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format Terraform generation response
   */
  static terraformGenerated(result: GeneratedTerraform): ApiResponse<GeneratedTerraform> {
    return this.success(result, 'Terraform configuration generated successfully');
  }

  /**
   * Format Terraform files list response
   */
  static terraformFilesList(files: TerraformFile[]): ApiResponse<{ files: TerraformFile[] }> {
    return this.success({ files });
  }

  /**
   * Format Terraform file content response
   */
  static terraformFileContent(filename: string, content: string): ApiResponse<{ filename: string; content: string; downloadUrl: string }> {
    return this.success({
      filename,
      content,
      downloadUrl: `/api/terraform-files/${filename}/download`
    });
  }

  /**
   * Format projects list response
   */
  static projectsList(projects: Array<{
    name: string;
    path: string;
    fileCount: number;
    createdAt: string;
    modifiedAt: string;
    size: number;
  }>): ApiResponse<{ projects: typeof projects }> {
    return this.success({
      projects: projects.map(project => ({
        ...project,
        downloadUrl: `/api/projects/${project.name}/download`,
        filesUrl: `/api/projects/${project.name}/files`
      }))
    }, `Found ${projects.length} project(s)`);
  }
}
