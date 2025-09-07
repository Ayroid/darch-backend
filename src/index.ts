import { App } from './App.js';
import { CLIService } from './services/CLIService.js';

/**
 * Main entry point for the Darch Backend
 * Supports both server mode and CLI mode
 */
function main(): void {
  // Check if running in CLI mode
  if (process.argv.includes('--cli')) {
    console.log('🛠️ Running in CLI mode...');
    CLIService.runCLI();
    return;
  }

  // Run in server mode
  console.log('🌐 Starting server mode...');
  const app = new App();
  app.start();
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the application
main();
