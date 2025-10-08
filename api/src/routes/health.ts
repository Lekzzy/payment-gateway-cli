import express, { Request, Response } from 'express';
import contractManager from '../config/contracts';
import logger from '../utils/logger';

const router = express.Router();

interface HealthResponse {
  success: boolean;
  message: string;
  timestamp: string;
  uptime: number;
  services: {
    api: string;
    contracts: string;
    database: string;
  };
  contracts?: {
    planRegistry?: {
      address: string;
      nextPlanId: string;
      status: string;
    };
    subscriptionRegistry?: {
      address: string;
      nextSubscriptionId: string;
      status: string;
    };
    chargeProcessor?: {
      address: string;
      platformFee: string;
      status: string;
    };
    error?: string;
  };
}

// Basic health check
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Crypto Subscription API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Detailed health check with contract status
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const health: HealthResponse = {
      success: true,
      message: 'Detailed health check',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        api: 'healthy',
        contracts: 'checking...',
        database: 'not applicable'
      },
      contracts: {}
    };

    // Check contract manager initialization
    if (!contractManager.isInitialized()) {
      health.services.contracts = 'not initialized';
      return res.status(503).json(health);
    }

    // Check each contract
    try {
      const planRegistry = contractManager.getContract('planRegistry');
      const subscriptionRegistry = contractManager.getContract('subscriptionRegistry');
      const chargeProcessor = contractManager.getContract('chargeProcessor');

      // Test contract calls
      const [nextPlanId, nextSubscriptionId, platformFee] = await Promise.all([
        planRegistry.nextPlanId(),
        subscriptionRegistry.nextSubscriptionId(),
        chargeProcessor.platformFeeBps()
      ]);

      health.contracts = {
        planRegistry: {
          address: planRegistry.address,
          nextPlanId: nextPlanId.toString(),
          status: 'healthy'
        },
        subscriptionRegistry: {
          address: subscriptionRegistry.address,
          nextSubscriptionId: nextSubscriptionId.toString(),
          status: 'healthy'
        },
        chargeProcessor: {
          address: chargeProcessor.address,
          platformFee: platformFee.toString(),
          status: 'healthy'
        }
      };

      health.services.contracts = 'healthy';
    } catch (error: any) {
      logger.error('Contract health check failed:', error);
      health.services.contracts = 'unhealthy';
      health.contracts!.error = error.message;
    }

    const statusCode = health.services.contracts === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error: any) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
