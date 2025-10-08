import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import contractManager from '../config/contracts';
import { validateRequest, validateAddress, validateId } from '../middleware/validation';
import logger from '../utils/logger';

const router = express.Router();

interface Subscription {
  id: string;
  planId: string;
  subscriber: string;
  payerToken: string;
  status: number;
  nextBilling: string;
  createdAt: string;
}

interface CreateSubscriptionRequest {
  planId: number;
  payerToken: string;
}

// Get subscription by ID
router.get('/:id',
  validateId('id'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const subscriptionRegistry = contractManager.getContract('subscriptionRegistry');
      
      const subscription = await subscriptionRegistry.getSubscription(id);
      
      if (!subscription.subscriber || subscription.subscriber === '0x0000000000000000000000000000000000000000') {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }
      
      res.json({
        success: true,
        data: {
          id: subscription.id.toString(),
          planId: subscription.planId.toString(),
          subscriber: subscription.subscriber,
          payerToken: subscription.payerToken,
          status: subscription.status,
          nextBilling: subscription.nextBilling.toString(),
          createdAt: subscription.createdAt.toString()
        }
      });
    } catch (error: any) {
      logger.error('Error fetching subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription',
        error: error.message
      });
    }
  }
);

// Get subscriptions for subscriber
router.get('/subscriber/:address',
  validateAddress('address'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const subscriptionRegistry = contractManager.getContract('subscriptionRegistry');
      
      const subscriptionIds = await subscriptionRegistry.getSubscriptionsForSubscriber(address);
      
      // Fetch details for each subscription
      const subscriptions = await Promise.all(
        subscriptionIds.map(async (id: any): Promise<Subscription> => {
          const subscription = await subscriptionRegistry.getSubscription(id);
          return {
            id: subscription.id.toString(),
            planId: subscription.planId.toString(),
            subscriber: subscription.subscriber,
            payerToken: subscription.payerToken,
            status: subscription.status,
            nextBilling: subscription.nextBilling.toString(),
            createdAt: subscription.createdAt.toString()
          };
        })
      );
      
      res.json({
        success: true,
        data: subscriptions
      });
    } catch (error: any) {
      logger.error('Error fetching subscriber subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscriber subscriptions',
        error: error.message
      });
    }
  }
);

// Get subscriptions for merchant
router.get('/merchant/:address',
  validateAddress('address'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const subscriptionRegistry = contractManager.getContract('subscriptionRegistry');
      
      const subscriptionIds = await subscriptionRegistry.getSubscriptionsForMerchant(address);
      
      // Fetch details for each subscription
      const subscriptions = await Promise.all(
        subscriptionIds.map(async (id: any): Promise<Subscription> => {
          const subscription = await subscriptionRegistry.getSubscription(id);
          return {
            id: subscription.id.toString(),
            planId: subscription.planId.toString(),
            subscriber: subscription.subscriber,
            payerToken: subscription.payerToken,
            status: subscription.status,
            nextBilling: subscription.nextBilling.toString(),
            createdAt: subscription.createdAt.toString()
          };
        })
      );
      
      res.json({
        success: true,
        data: subscriptions
      });
    } catch (error: any) {
      logger.error('Error fetching merchant subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch merchant subscriptions',
        error: error.message
      });
    }
  }
);

// Create subscription
router.post('/',
  [
    body('planId').isNumeric().withMessage('Plan ID must be a number'),
    body('payerToken').isEthereumAddress().withMessage('Payer token must be a valid address')
  ],
  validateRequest,
  async (req: Request<{}, {}, CreateSubscriptionRequest>, res: Response) => {
    try {
      const { planId, payerToken } = req.body;
      
      if (!contractManager.getWallet()) {
        return res.status(403).json({
          success: false,
          message: 'Wallet not available - read-only mode'
        });
      }
      
      const subscriptionRegistry = contractManager.getContract('subscriptionRegistry');
      
      const tx = await subscriptionRegistry.subscribe(planId, payerToken);
      const receipt = await tx.wait();
      
      // Extract subscription ID from event
      const event = receipt.events?.find((e: any) => e.event === 'Subscribed');
      const subscriptionId = event?.args?.subscriptionId?.toString();
      
      logger.info(`Subscription created with ID: ${subscriptionId}`);
      
      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: {
          subscriptionId,
          transactionHash: tx.hash
        }
      });
    } catch (error: any) {
      logger.error('Error creating subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create subscription',
        error: error.message
      });
    }
  }
);

// Cancel subscription
router.post('/:id/cancel',
  validateId('id'),
  validateRequest,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!contractManager.getWallet()) {
        return res.status(403).json({
          success: false,
          message: 'Wallet not available - read-only mode'
        });
      }
      
      const subscriptionRegistry = contractManager.getContract('subscriptionRegistry');
      
      const tx = await subscriptionRegistry.cancel(id);
      await tx.wait();
      
      logger.info(`Subscription ${id} cancelled successfully`);
      
      res.json({
        success: true,
        message: 'Subscription cancelled successfully',
        data: {
          transactionHash: tx.hash
        }
      });
    } catch (error: any) {
      logger.error('Error cancelling subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel subscription',
        error: error.message
      });
    }
  }
);

// Pause subscription
router.post('/:id/pause',
  validateId('id'),
  validateRequest,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!contractManager.getWallet()) {
        return res.status(403).json({
          success: false,
          message: 'Wallet not available - read-only mode'
        });
      }
      
      const subscriptionRegistry = contractManager.getContract('subscriptionRegistry');
      
      const tx = await subscriptionRegistry.pauseSubscription(id);
      await tx.wait();
      
      logger.info(`Subscription ${id} paused successfully`);
      
      res.json({
        success: true,
        message: 'Subscription paused successfully',
        data: {
          transactionHash: tx.hash
        }
      });
    } catch (error: any) {
      logger.error('Error pausing subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to pause subscription',
        error: error.message
      });
    }
  }
);

// Resume subscription
router.post('/:id/resume',
  validateId('id'),
  validateRequest,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!contractManager.getWallet()) {
        return res.status(403).json({
          success: false,
          message: 'Wallet not available - read-only mode'
        });
      }
      
      const subscriptionRegistry = contractManager.getContract('subscriptionRegistry');
      
      const tx = await subscriptionRegistry.resumeSubscription(id);
      await tx.wait();
      
      logger.info(`Subscription ${id} resumed successfully`);
      
      res.json({
        success: true,
        message: 'Subscription resumed successfully',
        data: {
          transactionHash: tx.hash
        }
      });
    } catch (error: any) {
      logger.error('Error resuming subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resume subscription',
        error: error.message
      });
    }
  }
);

export default router;
