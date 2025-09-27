// Jest setup file
import { jest } from '@jest/globals';

// Extend Jest matchers
expect.extend({
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },
});

// Global test configuration
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup global test variables
process.env.NODE_ENV = 'test';
process.env.API_KEY = 'test_12345';

// Global cleanup to prevent open handles
afterAll(async () => {
  // Close any open connections, timers, etc.
  await new Promise(resolve => setTimeout(resolve, 100));
});