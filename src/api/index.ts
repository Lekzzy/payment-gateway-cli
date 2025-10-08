#!/usr/bin/env node

import { ApiServer } from './server';
import { ConfigManager } from '../utils/config';

/**
 * Start the API server
 */
async function startServer() {
  try {
    // Get port from environment or use default
    const port = parseInt(process.env.PORT || '3000', 10);
    
    // Initialize configuration manager
    const configManager = new ConfigManager();
    
    console.log('🔧 Initializing Billing API Server...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Port: ${port}`);
    
    // Create and start server
    const server = new ApiServer(port);
    await server.start();
    
    console.log('✅ Server started successfully!');
    console.log('');
    console.log('Available endpoints:');
    console.log(`  GET  /api/v1/invoices/:id          - Get invoice details`);
    console.log(`  GET  /api/v1/invoices/:id/status   - Get invoice status`);
    console.log(`  POST /api/v1/invoices/:id/simulate-payment - Simulate payment (dev only)`);
    console.log(`  GET  /health                       - Health check`);
    console.log(`  GET  /docs                         - API documentation`);
    console.log(`  POST /api/v1/webhooks              - Receive and dispatch billing webhooks`);
    console.log('');
    
    // Check if configuration exists
    try {
      const config = await configManager.loadConfig();
      if (config) {
        console.log('✅ CLI configuration found');
        console.log(`   API Key: ${config.apiKey.substring(0, 10)}...`);
        console.log(`   Environment: ${config.environment}`);
      } else {
        console.log('⚠️  No CLI configuration found. Run "billing init" to configure.');
      }
    } catch (error) {
      console.log('⚠️  Could not load CLI configuration');
    }
    
    console.log('');
    console.log('🎯 Ready to serve hosted pay link requests!');
    
  } catch (error) {
    console.error('❌ Failed to start server:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Billing API Server

Usage:
  npm run api:start                Start the API server
  npm run api:start -- --port 4000 Start on custom port
  npm run api:dev                  Start in development mode

Options:
  --port, -p    Port number (default: 3000)
  --help, -h    Show this help message

Environment Variables:
  PORT          Port number
  NODE_ENV      Environment (development/production)

Examples:
  npm run api:start
  npm run api:start -- --port 4000
  PORT=4000 npm run api:start
`);
  process.exit(0);
}

// Parse port from command line
const portIndex = args.findIndex(arg => arg === '--port' || arg === '-p');
if (portIndex !== -1 && args[portIndex + 1]) {
  process.env.PORT = args[portIndex + 1];
}

// Start the server
startServer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { ApiServer };