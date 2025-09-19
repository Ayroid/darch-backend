import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ConfigUtils } from '../../../src/utils/ConfigUtils';

describe('ConfigUtils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env to a clean state
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getEnvVar', () => {
    it('should return environment variable value when set', () => {
      process.env.TEST_VAR = 'test-value';

      const result = ConfigUtils.getEnvVar('TEST_VAR', 'default');

      expect(result).toBe('test-value');
    });

    it('should return default value when environment variable is not set', () => {
      delete process.env.TEST_VAR;

      const result = ConfigUtils.getEnvVar('TEST_VAR', 'default');

      expect(result).toBe('default');
    });

    it('should return default value when environment variable is empty string', () => {
      process.env.TEST_VAR = '';

      const result = ConfigUtils.getEnvVar('TEST_VAR', 'default');

      expect(result).toBe('default');
    });

    it('should return environment variable when set to falsy values', () => {
      process.env.TEST_VAR = '0';

      const result = ConfigUtils.getEnvVar('TEST_VAR', 'default');

      expect(result).toBe('0');
    });

    it('should handle special characters in environment variables', () => {
      process.env.TEST_VAR = 'special!@#$%^&*()_+-={}[]|\\:";\'<>?,./';

      const result = ConfigUtils.getEnvVar('TEST_VAR', 'default');

      expect(result).toBe('special!@#$%^&*()_+-={}[]|\\:";\'<>?,./');
    });
  });

  describe('getPort', () => {
    it('should return port from PORT environment variable when set', () => {
      process.env.PORT = '8080';

      const result = ConfigUtils.getPort();

      expect(result).toBe(8080);
    });

    it('should return default port 5000 when PORT is not set', () => {
      delete process.env.PORT;

      const result = ConfigUtils.getPort();

      expect(result).toBe(5000);
    });

    it('should return default port when PORT is empty string', () => {
      process.env.PORT = '';

      const result = ConfigUtils.getPort();

      expect(result).toBe(5000);
    });

    it('should parse string port numbers correctly', () => {
      process.env.PORT = '3000';

      const result = ConfigUtils.getPort();

      expect(result).toBe(3000);
    });

    it('should handle invalid port values gracefully', () => {
      process.env.PORT = 'not-a-number';

      const result = ConfigUtils.getPort();

      expect(result).toBeNaN();
    });

    it('should handle port value with leading zeros', () => {
      process.env.PORT = '0008080';

      const result = ConfigUtils.getPort();

      expect(result).toBe(8080);
    });

    it('should handle negative port values', () => {
      process.env.PORT = '-1000';

      const result = ConfigUtils.getPort();

      expect(result).toBe(-1000);
    });
  });

  describe('isDevelopment', () => {
    it('should return true when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';

      const result = ConfigUtils.isDevelopment();

      expect(result).toBe(true);
    });

    it('should return true when NODE_ENV is not set (default)', () => {
      delete process.env.NODE_ENV;

      const result = ConfigUtils.isDevelopment();

      expect(result).toBe(true);
    });

    it('should return false when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';

      const result = ConfigUtils.isDevelopment();

      expect(result).toBe(false);
    });

    it('should return false when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';

      const result = ConfigUtils.isDevelopment();

      expect(result).toBe(false);
    });

    it('should return false when NODE_ENV is staging', () => {
      process.env.NODE_ENV = 'staging';

      const result = ConfigUtils.isDevelopment();

      expect(result).toBe(false);
    });

    it('should be case sensitive for environment check', () => {
      process.env.NODE_ENV = 'DEVELOPMENT';

      const result = ConfigUtils.isDevelopment();

      expect(result).toBe(false);
    });
  });

  describe('isProduction', () => {
    it('should return true when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';

      const result = ConfigUtils.isProduction();

      expect(result).toBe(true);
    });

    it('should return false when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';

      const result = ConfigUtils.isProduction();

      expect(result).toBe(false);
    });

    it('should return false when NODE_ENV is not set (default)', () => {
      delete process.env.NODE_ENV;

      const result = ConfigUtils.isProduction();

      expect(result).toBe(false);
    });

    it('should return false when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';

      const result = ConfigUtils.isProduction();

      expect(result).toBe(false);
    });

    it('should be case sensitive for environment check', () => {
      process.env.NODE_ENV = 'PRODUCTION';

      const result = ConfigUtils.isProduction();

      expect(result).toBe(false);
    });
  });

  describe('getCorsOrigin', () => {
    it('should return true when CORS_ORIGIN is * (wildcard)', () => {
      process.env.CORS_ORIGIN = '*';

      const result = ConfigUtils.getCorsOrigin();

      expect(result).toBe(true);
    });

    it('should return true when CORS_ORIGIN is not set (default)', () => {
      delete process.env.CORS_ORIGIN;

      const result = ConfigUtils.getCorsOrigin();

      expect(result).toBe(true);
    });

    it('should return specific origin when CORS_ORIGIN is set to a domain', () => {
      process.env.CORS_ORIGIN = 'https://example.com';

      const result = ConfigUtils.getCorsOrigin();

      expect(result).toBe('https://example.com');
    });

    it('should return localhost origin correctly', () => {
      process.env.CORS_ORIGIN = 'http://localhost:3000';

      const result = ConfigUtils.getCorsOrigin();

      expect(result).toBe('http://localhost:3000');
    });

    it('should handle multiple domains as a string', () => {
      process.env.CORS_ORIGIN = 'https://app.example.com,https://admin.example.com';

      const result = ConfigUtils.getCorsOrigin();

      expect(result).toBe('https://app.example.com,https://admin.example.com');
    });

    it('should return empty string when CORS_ORIGIN is empty', () => {
      process.env.CORS_ORIGIN = '';

      const result = ConfigUtils.getCorsOrigin();

      expect(result).toBe(true); // Because empty string falls back to default '*'
    });

    it('should handle IP addresses', () => {
      process.env.CORS_ORIGIN = 'http://192.168.1.100:3000';

      const result = ConfigUtils.getCorsOrigin();

      expect(result).toBe('http://192.168.1.100:3000');
    });

    it('should handle special CORS origin values', () => {
      process.env.CORS_ORIGIN = 'null';

      const result = ConfigUtils.getCorsOrigin();

      expect(result).toBe('null');
    });
  });

  describe('Environment integration', () => {
    it('should work correctly with different NODE_ENV and PORT combinations', () => {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '8080';

      expect(ConfigUtils.isProduction()).toBe(true);
      expect(ConfigUtils.isDevelopment()).toBe(false);
      expect(ConfigUtils.getPort()).toBe(8080);
    });

    it('should handle all configuration values being set', () => {
      process.env.NODE_ENV = 'development';
      process.env.PORT = '3000';
      process.env.CORS_ORIGIN = 'http://localhost:3000';

      expect(ConfigUtils.isDevelopment()).toBe(true);
      expect(ConfigUtils.isProduction()).toBe(false);
      expect(ConfigUtils.getPort()).toBe(3000);
      expect(ConfigUtils.getCorsOrigin()).toBe('http://localhost:3000');
    });

    it('should handle mixed environment configurations', () => {
      process.env.NODE_ENV = 'test';
      process.env.PORT = '9999';
      process.env.CORS_ORIGIN = '*';

      expect(ConfigUtils.isDevelopment()).toBe(false);
      expect(ConfigUtils.isProduction()).toBe(false);
      expect(ConfigUtils.getPort()).toBe(9999);
      expect(ConfigUtils.getCorsOrigin()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined environment variables', () => {
      process.env.TEST_VAR = undefined as any;

      const result = ConfigUtils.getEnvVar('TEST_VAR', 'fallback');

      expect(result).toBe('fallback');
    });

    it('should handle very large port numbers', () => {
      process.env.PORT = '65535';

      const result = ConfigUtils.getPort();

      expect(result).toBe(65535);
    });

    it('should handle decimal port numbers by truncating', () => {
      process.env.PORT = '3000.5';

      const result = ConfigUtils.getPort();

      expect(result).toBe(3000);
    });

    it('should handle whitespace in environment variables', () => {
      process.env.TEST_VAR = '  spaced value  ';

      const result = ConfigUtils.getEnvVar('TEST_VAR', 'default');

      expect(result).toBe('  spaced value  ');
    });
  });
});
