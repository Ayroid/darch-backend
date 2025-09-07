export class ConfigUtils {
  /**
   * Get environment variable with default value
   */
  static getEnvVar(name: string, defaultValue: string): string {
    return process.env[name] || defaultValue;
  }

  /**
   * Get port from environment or default
   */
  static getPort(): number {
    return parseInt(this.getEnvVar('PORT', '5000'), 10);
  }

  /**
   * Check if running in development mode
   */
  static isDevelopment(): boolean {
    return this.getEnvVar('NODE_ENV', 'development') === 'development';
  }

  /**
   * Check if running in production mode
   */
  static isProduction(): boolean {
    return this.getEnvVar('NODE_ENV', 'development') === 'production';
  }

  /**
   * Get CORS origin
   */
  static getCorsOrigin(): string | boolean {
    const origin = this.getEnvVar('CORS_ORIGIN', '*');
    return origin === '*' ? true : origin;
  }
}
