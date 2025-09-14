import fs from "fs";
import path from "path";
import { logger, LogCategory } from '../utils/Logger.js';

export class CLIService {
	/**
	 * Run CLI functionality
	 */
	static runCLI(): void {
		logger.info("🚀 Darch Backend - Modular Terraform Generator", {
			category: LogCategory.APP,
			component: 'CLIService'
		});

		logger.info("Available API endpoints:\n" +
			"  POST /api/terraform/generate    - Generate modular Terraform\n" +
			"  GET  /api/modules              - List available modules\n" +
			"  POST /api/validate/architecture - Validate architecture\n" +
			"  POST /api/terraform/plan       - Generate Terraform plan", {
			category: LogCategory.APP,
			component: 'CLIService',
			operation: 'displayEndpoints'
		});

		logger.info("Server running on port 5000 (or PORT environment variable)\nFor more information, check the documentation", {
			category: LogCategory.APP,
			component: 'CLIService',
			operation: 'serverInfo'
		});

		process.exit(0);
	}
}
