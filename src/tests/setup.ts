// Jest setup file
import { jest } from '@jest/globals';
import { TestApiServer } from '../api/test-server';

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
let sdkTestServer: TestApiServer | null = null;
let chosenPort: number | null = null;

beforeAll(async () => {
  const candidatePorts = process.env.TEST_API_PORT
    ? [parseInt(process.env.TEST_API_PORT, 10)]
    : [3002, 3003, 3004];

  let started = false;
  for (const port of candidatePorts) {
    try {
      sdkTestServer = new TestApiServer(port);
      await sdkTestServer.start();
      chosenPort = port;
      started = true;
      break;
    } catch (err) {
      // Try next port on EADDRINUSE or similar errors
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('EADDRINUSE')) {
        // Non-port conflict error, continue trying next port anyway
      }
    }
  }

  if (!started || !chosenPort) {
    throw new Error('Failed to start TestApiServer on candidate ports: ' + candidatePorts.join(', '));
  }

  process.env.TEST_API_PORT = String(chosenPort);
  process.env.TEST_API_BASE_URL = `http://localhost:${chosenPort}/api/v1`;
});

afterAll(async () => {
  // Close any open connections, timers, etc.
  await new Promise(resolve => setTimeout(resolve, 100));
  if (sdkTestServer) {
    await sdkTestServer.stop();
    sdkTestServer = null;
  }
});