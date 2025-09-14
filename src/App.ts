import express from "express";
import cors from "cors";
import { ConfigUtils } from "./utils/ConfigUtils.js";
import { LoggingMiddleware } from "./middleware/LoggingMiddleware.js";
import { ErrorMiddleware } from "./middleware/ErrorMiddleware.js";
import { TerraformExecutionService } from "./services/TerraformExecutionService.js";
import { logger, LogCategory, LogLevel } from "./utils/Logger.js";
import routes from "./routes/index.js";

export class App {
	private app: express.Application;
	private port: number;

	constructor() {
		this.app = express();
		this.port = ConfigUtils.getPort();

		logger.app(LogLevel.INFO, '⚙️ Initializing Darch Backend Application', {
			component: 'App',
			port: this.port,
			environment: ConfigUtils.isDevelopment() ? 'development' : 'production'
		});

		this.initializeMiddleware();
		this.initializeRoutes();
		this.initializeErrorHandling();
		this.initializeJobCleanup();

		logger.app(LogLevel.INFO, '✅ Application initialization completed', {
			component: 'App'
		});
	}

	private initializeMiddleware(): void {
		// CORS
		this.app.use(
			cors({
				origin: ConfigUtils.getCorsOrigin(),
				credentials: true,
			})
		);

		// Body parsing
		this.app.use(express.json({ limit: "10mb" }));
		this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

		// Logging
		if (ConfigUtils.isDevelopment()) {
			this.app.use(LoggingMiddleware.log);
		}
	}

	private initializeRoutes(): void {
		// Mount all routes
		this.app.use("/", routes);

		// 404 handler - use a specific path instead of *
		this.app.use((req, res, next) => {
			ErrorMiddleware.notFound(req, res);
		});
	}

	private initializeErrorHandling(): void {
		// Global error handler
		this.app.use(ErrorMiddleware.handle);
	}

	private initializeJobCleanup(): void {
		// Clean up completed jobs every 10 minutes
		const cleanupInterval = 10 * 60 * 1000;

		logger.app(LogLevel.INFO, '⚙️ Initializing job cleanup service', {
			component: 'JobCleanup',
			intervalMs: cleanupInterval
		});

		setInterval(() => {
			logger.app(LogLevel.DEBUG, '🧹 Running job cleanup', {
				component: 'JobCleanup'
			});
			TerraformExecutionService.cleanupCompletedJobs();
		}, cleanupInterval);
	}

	public start(): void {
		const startTime = Date.now();

		this.app.listen(this.port, () => {
			const bootTime = Date.now() - startTime;
			const environment = ConfigUtils.isDevelopment() ? "Development" : "Production";

			logger.app(LogLevel.INFO, '🚀 Backend server started successfully', {
				component: 'Server',
				port: this.port,
				environment,
				bootTimeMs: bootTime,
				urls: {
					server: `http://localhost:${this.port}`,
					health: `http://localhost:${this.port}/health`,
					terraform: `http://localhost:${this.port}/api/terraform/generate`
				}
			});

			// Also log to console for immediate visibility
			if (ConfigUtils.isDevelopment()) {
				console.log(`\n🚀 Backend server running on http://localhost:${this.port}`);
				console.log(`📊 Health check: http://localhost:${this.port}/health`);
				console.log(`🔧 Terraform API: http://localhost:${this.port}/api/terraform/generate`);
				console.log(`🌍 Environment: ${environment}\n`);
			}
		});
	}

	public getApp(): express.Application {
		return this.app;
	}
}
