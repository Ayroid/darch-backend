import express from 'express';
import cors from 'cors';
import { ConfigUtils } from './utils/ConfigUtils.js';
import { LoggingMiddleware } from './middleware/LoggingMiddleware.js';
import { ErrorMiddleware } from './middleware/ErrorMiddleware.js';
import { TerraformExecutionService } from './services/TerraformExecutionService.js';
import routes from './routes/index.js';

export class App {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = ConfigUtils.getPort();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeJobCleanup();
  }

  private initializeMiddleware(): void {
    // CORS
    this.app.use(cors({
      origin: ConfigUtils.getCorsOrigin(),
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (ConfigUtils.isDevelopment()) {
      this.app.use(LoggingMiddleware.log);
    }
  }

  private initializeRoutes(): void {
    // Mount all routes
    this.app.use('/', routes);

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
    setInterval(() => {
      TerraformExecutionService.cleanupCompletedJobs();
    }, 10 * 60 * 1000);
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 Backend server running on http://localhost:${this.port}`);
      console.log(`📊 Health check: http://localhost:${this.port}/health`);
      console.log(`🔧 Terraform API: http://localhost:${this.port}/api/terraform/generate`);
      console.log(`🌍 Environment: ${ConfigUtils.isDevelopment() ? 'Development' : 'Production'}`);
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}
