import fs from 'fs';
import path from 'path';

export class CLIService {
  /**
   * Run CLI functionality
   */
  static runCLI(): void {
    console.log('🚀 Darch Backend - Modular Terraform Generator');
    console.log('');
    console.log('Available API endpoints:');
    console.log('  POST /api/generate-terraform    - Generate modular Terraform');
    console.log('  GET  /api/modules              - List available modules');
    console.log('  POST /api/validate/architecture - Validate architecture');
    console.log('  POST /api/terraform/plan       - Generate Terraform plan');
    console.log('');
    console.log('Server running on port 3000 (or PORT environment variable)');
    console.log('For more information, check the documentation');

    process.exit(0);
  }
}
