import winston from 'winston';
import path from 'path';
import { ConfigUtils } from './ConfigUtils.js';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug'
}

export enum LogCategory {
  APP = 'APP',
  HTTP = 'HTTP',
  TERRAFORM = 'TERRAFORM',
  FILE = 'FILE',
  AUTH = 'AUTH',
  DATABASE = 'DATABASE',
  VALIDATION = 'VALIDATION',
  ARCHITECTURE = 'ARCHITECTURE',
  MODULE = 'MODULE'
}

interface LogMeta {
  category?: LogCategory;
  userId?: string;
  projectId?: string;
  jobId?: string;
  duration?: number;
  requestId?: string;
  component?: string;
  operation?: string;
  [key: string]: any;
}

class Logger {
  private winston: winston.Logger;

  constructor() {
    this.winston = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const isDevelopment = ConfigUtils.isDevelopment();
    const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, category, component, ...meta }) => {
        const categoryStr = category ? `[${category}]` : '';
        const componentStr = component ? `[${component}]` : '';
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${categoryStr}${componentStr} ${message}${metaStr}`;
      })
    );

    // Create transports
    const transports: winston.transport[] = [];

    // Console transport for development
    if (isDevelopment) {
      transports.push(
        new winston.transports.Console({
          level: logLevel,
          format: consoleFormat
        })
      );
    }

    // File transports for production and development
    const logsDir = path.resolve(process.cwd(), 'logs');

    // Error log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );

    // Combined log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );

    // HTTP log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'http.log'),
        level: 'http',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 3
      })
    );

    // Production console transport (JSON format)
    if (!isDevelopment) {
      transports.push(
        new winston.transports.Console({
          level: logLevel,
          format: logFormat
        })
      );
    }

    return winston.createLogger({
      level: logLevel,
      format: logFormat,
      defaultMeta: { service: 'darch-backend' },
      transports,
      // Handle uncaught exceptions and rejections
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(logsDir, 'exceptions.log'),
          format: logFormat
        })
      ],
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(logsDir, 'rejections.log'),
          format: logFormat
        })
      ],
      exitOnError: false
    });
  }

  // Core logging methods
  error(message: string, meta: LogMeta = {}): void {
    this.winston.error(message, meta);
  }

  warn(message: string, meta: LogMeta = {}): void {
    this.winston.warn(message, meta);
  }

  info(message: string, meta: LogMeta = {}): void {
    this.winston.info(message, meta);
  }

  http(message: string, meta: LogMeta = {}): void {
    this.winston.http(message, { ...meta, category: LogCategory.HTTP });
  }

  debug(message: string, meta: LogMeta = {}): void {
    this.winston.debug(message, meta);
  }

  // Convenience methods for different categories
  app(level: LogLevel, message: string, meta: LogMeta = {}): void {
    this.winston.log(level, message, { ...meta, category: LogCategory.APP });
  }

  terraform(level: LogLevel, message: string, meta: LogMeta = {}): void {
    this.winston.log(level, message, { ...meta, category: LogCategory.TERRAFORM });
  }

  file(level: LogLevel, message: string, meta: LogMeta = {}): void {
    this.winston.log(level, message, { ...meta, category: LogCategory.FILE });
  }

  auth(level: LogLevel, message: string, meta: LogMeta = {}): void {
    this.winston.log(level, message, { ...meta, category: LogCategory.AUTH });
  }

  validation(level: LogLevel, message: string, meta: LogMeta = {}): void {
    this.winston.log(level, message, { ...meta, category: LogCategory.VALIDATION });
  }

  architecture(level: LogLevel, message: string, meta: LogMeta = {}): void {
    this.winston.log(level, message, { ...meta, category: LogCategory.ARCHITECTURE });
  }

  module(level: LogLevel, message: string, meta: LogMeta = {}): void {
    this.winston.log(level, message, { ...meta, category: LogCategory.MODULE });
  }

  // Structured logging for HTTP requests
  logRequest(method: string, path: string, ip: string, userAgent?: string, meta: LogMeta = {}): void {
    this.http(`📥 ${method} ${path}`, {
      ...meta,
      method,
      path,
      ip,
      userAgent,
      type: 'request'
    });
  }

  logResponse(method: string, path: string, statusCode: number, duration: number, meta: LogMeta = {}): void {
    const emoji = statusCode >= 400 ? '❌' : statusCode >= 300 ? '↩️' : '✅';
    this.http(`📤 ${emoji} ${method} ${path} - ${statusCode} - ${duration}ms`, {
      ...meta,
      method,
      path,
      statusCode,
      duration,
      type: 'response'
    });
  }

  // Structured logging for operations
  logOperation(operation: string, component: string, status: 'start' | 'success' | 'error', meta: LogMeta = {}): void {
    const emoji = status === 'start' ? '🔄' : status === 'success' ? '✅' : '❌';
    const level = status === 'error' ? LogLevel.ERROR : LogLevel.INFO;

    this.winston.log(level, `${emoji} ${operation}`, {
      ...meta,
      component,
      operation,
      status
    });
  }

  // Terraform-specific logging methods
  logTerraformJob(jobId: string, operation: string, status: string, meta: LogMeta = {}): void {
    this.terraform(LogLevel.INFO, `Terraform job ${operation}: ${status}`, {
      ...meta,
      jobId,
      operation,
      status,
      component: 'TerraformExecution'
    });
  }

  logTerraformCommand(command: string, exitCode?: number, meta: LogMeta = {}): void {
    const level = exitCode !== undefined && exitCode !== 0 ? LogLevel.ERROR : LogLevel.DEBUG;
    const emoji = exitCode !== undefined ? (exitCode === 0 ? '✅' : '❌') : '🔧';

    this.terraform(level, `${emoji} terraform ${command}`, {
      ...meta,
      command,
      exitCode,
      component: 'TerraformCLI'
    });
  }

  // File operation logging
  logFileOperation(operation: string, filePath: string, success: boolean, meta: LogMeta = {}): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const emoji = success ? '💾' : '❌';

    this.file(level, `${emoji} ${operation}: ${filePath}`, {
      ...meta,
      operation,
      filePath,
      success,
      component: 'FileManager'
    });
  }

  // Performance logging
  logPerformance(operation: string, duration: number, meta: LogMeta = {}): void {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.DEBUG;
    const emoji = duration > 5000 ? '⏱️' : '⚡';

    this.debug(`${emoji} ${operation} completed in ${duration}ms`, {
      ...meta,
      operation,
      duration,
      type: 'performance'
    });
  }

  // Validation logging
  logValidation(type: string, success: boolean, errors?: string[], meta: LogMeta = {}): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const emoji = success ? '✅' : '⚠️';

    this.validation(level, `${emoji} ${type} validation ${success ? 'passed' : 'failed'}`, {
      ...meta,
      type,
      success,
      errors,
      component: 'Validation'
    });
  }

  // Get the underlying winston instance for advanced usage
  getWinstonLogger(): winston.Logger {
    return this.winston;
  }
}

// Export a singleton instance
export const logger = new Logger();
export default logger;
