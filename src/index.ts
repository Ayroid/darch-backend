import { App } from './App.js';
import { CLIService } from './services/CLIService.js';
import { ModuleRegistryService } from './services/ModuleRegistryService.js';
import { logger, LogCategory, LogLevel } from './utils/Logger.js';

/**
 * Main entry point for the Darch Backend
 * Supports both server mode and CLI mode
 */
async function main(): Promise<void> {
  const startTime = Date.now();

  try {
    logger.app(LogLevel.INFO, '🚀 Starting Darch Backend Application', {
      component: 'Main',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      argv: process.argv
    });

    // Initialize module registry for modular architecture
    logger.module(LogLevel.INFO, '🔧 Initializing Terraform Module Registry', {
      component: 'ModuleRegistry'
    });

    const registryStartTime = Date.now();
    await ModuleRegistryService.initialize();
    const registryInitTime = Date.now() - registryStartTime;

    logger.module(LogLevel.INFO, '✅ Terraform Module Registry initialized', {
      component: 'ModuleRegistry',
      initTimeMs: registryInitTime
    });

    // Check if running in CLI mode
    if (process.argv.includes('--cli')) {
      logger.app(LogLevel.INFO, '🛠️ Starting CLI mode', {
        component: 'CLI'
      });
      CLIService.runCLI();
      return;
    }

    // Run in server mode
    logger.app(LogLevel.INFO, '🌐 Starting server mode', {
      component: 'Server'
    });

    const app = new App();
    app.start();

    const totalBootTime = Date.now() - startTime;
    logger.app(LogLevel.INFO, '✅ Application boot completed', {
      component: 'Main',
      totalBootTimeMs: totalBootTime
    });

  } catch (error) {
    const bootTime = Date.now() - startTime;

    logger.error('❌ Failed to start application', {
      component: 'Main',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      bootTimeMs: bootTime,
      category: LogCategory.APP
    });

    // Also log to console for immediate visibility in case Winston isn't working
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions with structured logging
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception - Application will exit', {
    component: 'ProcessHandler',
    error: error.message,
    stack: error.stack,
    category: LogCategory.APP
  });

  console.error('❌ Uncaught Exception:', error);

  // Give Winston time to write logs before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle unhandled promise rejections with structured logging
process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Promise Rejection - Application will exit', {
    component: 'ProcessHandler',
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: String(promise),
    category: LogCategory.APP
  });

  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);

  // Give Winston time to write logs before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle graceful shutdown with structured logging
process.on('SIGTERM', () => {
  logger.app(LogLevel.INFO, '👋 SIGTERM received - Initiating graceful shutdown', {
    component: 'ProcessHandler',
    signal: 'SIGTERM'
  });

  console.log('👋 SIGTERM received, shutting down gracefully...');

  // Give Winston time to flush logs
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

process.on('SIGINT', () => {
  logger.app(LogLevel.INFO, '👋 SIGINT received - Initiating graceful shutdown', {
    component: 'ProcessHandler',
    signal: 'SIGINT'
  });

  console.log('👋 SIGINT received, shutting down gracefully...');

  // Give Winston time to flush logs
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

// Start the application
main();
