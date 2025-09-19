// Global test setup
import { jest } from '@jest/globals';

// Mock console methods to avoid noise in tests unless specifically testing logging
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock process.env for consistent testing
process.env.NODE_ENV = 'test';
process.env.PORT = '5000';
process.env.CORS_ORIGIN = '*';

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
