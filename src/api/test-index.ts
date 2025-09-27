#!/usr/bin/env node

import { TestApiServer } from './test-server';

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let port = 3002;
  let showHelp = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--port' || arg === '-p') {
      const portValue = args[i + 1];
      if (portValue && !isNaN(parseInt(portValue))) {
        port = parseInt(portValue);
        i++; // Skip next argument
      } else {
        console.error('❌ Invalid port number');
        process.exit(1);
      }
    } else if (arg === '--help' || arg === '-h') {
      showHelp = true;
    }
  }

  if (showHelp) {
    console.log(`
🧪 Billing System Test API Server

Usage: npm run test:api [options]

Options:
  -p, --port <number>    Port to run the server on (default: 3002)
  -h, --help            Show this help message

Examples:
  npm run test:api                    # Start on default port 3002
  npm run test:api -- --port 4000     # Start on port 4000

API Endpoints:
  GET  /                             # API documentation
  GET  /health                       # Health check
  
  Plans:
  GET    /api/v1/plans               # List plans
  GET    /api/v1/plans/:id           # Get plan by ID
  POST   /api/v1/plans               # Create plan
  PUT    /api/v1/plans/:id           # Update plan
  DELETE /api/v1/plans/:id           # Delete plan
  
  Invoices:
  GET  /api/v1/invoices              # List invoices
  GET  /api/v1/invoices/:id          # Get invoice by ID
  POST /api/v1/invoices              # Create invoice
  POST /api/v1/invoices/:id/pay      # Mark as paid
  POST /api/v1/invoices/:id/cancel   # Cancel invoice
  
  Refunds:
  GET  /api/v1/refunds               # List refunds
  GET  /api/v1/refunds/:id           # Get refund by ID
  POST /api/v1/refunds               # Create refund
  PUT  /api/v1/refunds/:id           # Update refund status
  
  Webhooks:
  GET  /api/v1/webhooks/events       # List webhook events
  POST /api/v1/webhooks/test         # Send test webhook
  POST /api/v1/webhooks/verify       # Verify webhook signature
  
  Test Utilities:
  POST /api/v1/test/reset            # Reset all data to defaults
  POST /api/v1/test/generate         # Generate random test data
  GET  /api/v1/test/fixtures         # Get all fixture data

Authentication:
  Include API key in X-API-Key header or Authorization: Bearer <key>
  Use test_xxx or live_xxx format for API keys
`);
    process.exit(0);
  }

  console.log('🚀 Starting Billing System Test API Server...');
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Port: ${port}`);
  console.log('');

  const server = new TestApiServer(port);

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
    
    try {
      await server.stop();
      console.log('✅ Test API Server stopped successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });

  try {
    await server.start();
    
    console.log('');
    console.log('🎯 Available endpoints:');
    console.log(`   📋 Documentation: http://localhost:${port}/`);
    console.log(`   🏥 Health Check:  http://localhost:${port}/health`);
    console.log(`   📊 Plans API:     http://localhost:${port}/api/v1/plans`);
    console.log(`   🧾 Invoices API:  http://localhost:${port}/api/v1/invoices`);
    console.log(`   💰 Refunds API:   http://localhost:${port}/api/v1/refunds`);
    console.log(`   🔗 Webhooks API:  http://localhost:${port}/api/v1/webhooks/events`);
    console.log(`   🔧 Test Utils:    http://localhost:${port}/api/v1/test/fixtures`);
    console.log('');
    console.log('💡 Example API calls:');
    console.log(`   curl -H "X-API-Key: test_12345" http://localhost:${port}/api/v1/plans`);
    console.log(`   curl -H "X-API-Key: test_12345" http://localhost:${port}/api/v1/invoices`);
    console.log('');
    console.log('🛑 Press Ctrl+C to stop the server');
    
  } catch (error) {
    console.error('❌ Failed to start Test API Server:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { TestApiServer };