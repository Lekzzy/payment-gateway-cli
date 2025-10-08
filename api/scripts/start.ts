#!/usr/bin/env ts-node

import contractManager from '../src/config/contracts';
import logger from '../src/utils/logger';

async function start(): Promise<void> {
  try {
    logger.info('Initializing contract manager...');
    await contractManager.initialize();
    logger.info('Contract manager initialized successfully');
    
    // Start the server
    require('../src/index');
  } catch (error: any) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

start();
