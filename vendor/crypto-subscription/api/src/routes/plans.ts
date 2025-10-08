import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import contractManager from '../config/contracts';
import { validateRequest, validateAddress, validateId } from '../middleware/validation';
import logger from '../utils/logger';

const router = express.Router();

interface Plan {
  id: string;
  merchant: string;
  name: string;
  priceInCents: string;
  currency: string;
  billingIntervalSeconds: string;
  allowedTokens: string[];
  active: boolean;
}

interface CreatePlanRequest {
  name: string;
  priceInCents: number;
  currency: string;
  billingIntervalSeconds: number;
  allowedTokens: string[];
}

interface UpdatePlanRequest {
  name?: string;
  priceInCents?: number;
  billingIntervalSeconds?: number;
  allowedTokens?: string[];
  active?: boolean;
}

// Get all plans for a merchant
router.get('/merchant/:address', 
  validateId('address'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const planRegistry = contractManager.getContract('planRegistry');
      
      const plans = await planRegistry.getMerchantPlanDetails(address);
      
      res.json({
        success: true,
        data: plans.map((plan: any): Plan => ({
          id: plan.id.toString(),
          merchant: plan.merchant,
          name: plan.name,
          priceInCents: plan.priceInCents.toString(),
          currency: plan.currency,
          billingIntervalSeconds: plan.billingIntervalSeconds.toString(),
          allowedTokens: plan.allowedTokens,
          active: plan.active
        }))
      });
    } catch (error: any) {
      logger.error('Error fetching merchant plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch merchant plans',
        error: error.message
      });
    }
  }
);

// Get plan by ID
router.get('/:id',
  validateId('id'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const planRegistry = contractManager.getContract('planRegistry');
      
      const plan = await planRegistry.getPlan(id);
      
      if (!plan.merchant || plan.merchant === '0x0000000000000000000000000000000000000000') {
        return res.status(404).json({
          success: false,
          message: 'Plan not found'
        });
      }
      
      res.json({
        success: true,
        data: {
          id: plan.id.toString(),
          merchant: plan.merchant,
          name: plan.name,
          priceInCents: plan.priceInCents.toString(),
          currency: plan.currency,
          billingIntervalSeconds: plan.billingIntervalSeconds.toString(),
          allowedTokens: plan.allowedTokens,
          active: plan.active
        }
      });
    } catch (error: any) {
      logger.error('Error fetching plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch plan',
        error: error.message
      });
    }
  }
);

// Create new plan
router.post('/',
  [
    body('name').notEmpty().withMessage('Plan name is required'),
    body('priceInCents').isNumeric().withMessage('Price must be a number'),
    body('currency').notEmpty().withMessage('Currency is required'),
    body('billingIntervalSeconds').isNumeric().withMessage('Billing interval must be a number'),
    body('allowedTokens').isArray({ min: 1 }).withMessage('At least one allowed token is required'),
    body('allowedTokens.*').isEthereumAddress().withMessage('Invalid token address')
  ],
  validateRequest,
  async (req: Request<{}, {}, CreatePlanRequest>, res: Response) => {
    try {
      const { name, priceInCents, currency, billingIntervalSeconds, allowedTokens } = req.body;
      
      if (!contractManager.getWallet()) {
        return res.status(403).json({
          success: false,
          message: 'Wallet not available - read-only mode'
        });
      }
      
      const planRegistry = contractManager.getContract('planRegistry');
      
      const tx = await planRegistry.createPlan(
        name,
        priceInCents,
        currency,
        billingIntervalSeconds,
        allowedTokens
      );
      
      const receipt = await tx.wait();
      
      // Extract plan ID from event
      const event = receipt.events?.find((e: any) => e.event === 'PlanCreated');
      const planId = event?.args?.planId?.toString();
      
      logger.info(`Plan created with ID: ${planId}`);
      
      res.status(201).json({
        success: true,
        message: 'Plan created successfully',
        data: {
          planId,
          transactionHash: tx.hash
        }
      });
    } catch (error: any) {
      logger.error('Error creating plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create plan',
        error: error.message
      });
    }
  }
);

// Update plan
router.put('/:id',
  [
    validateId('id'),
    body('name').optional().notEmpty().withMessage('Plan name cannot be empty'),
    body('priceInCents').optional().isNumeric().withMessage('Price must be a number'),
    body('billingIntervalSeconds').optional().isNumeric().withMessage('Billing interval must be a number'),
    body('allowedTokens').optional().isArray({ min: 1 }).withMessage('At least one allowed token is required'),
    body('allowedTokens.*').optional().isEthereumAddress().withMessage('Invalid token address'),
    body('active').optional().isBoolean().withMessage('Active must be a boolean')
  ],
  validateRequest,
  async (req: Request<{ id: string }, {}, UpdatePlanRequest>, res: Response) => {
    try {
      const { id } = req.params;
      const { name, priceInCents, billingIntervalSeconds, allowedTokens, active } = req.body;
      
      if (!contractManager.getWallet()) {
        return res.status(403).json({
          success: false,
          message: 'Wallet not available - read-only mode'
        });
      }
      
      const planRegistry = contractManager.getContract('planRegistry');
      
      // Get current plan to fill in missing fields
      const currentPlan = await planRegistry.getPlan(id);
      
      const tx = await planRegistry.updatePlan(
        id,
        name || currentPlan.name,
        priceInCents || currentPlan.priceInCents,
        billingIntervalSeconds || currentPlan.billingIntervalSeconds,
        allowedTokens || currentPlan.allowedTokens,
        active !== undefined ? active : currentPlan.active
      );
      
      await tx.wait();
      
      logger.info(`Plan ${id} updated successfully`);
      
      res.json({
        success: true,
        message: 'Plan updated successfully',
        data: {
          transactionHash: tx.hash
        }
      });
    } catch (error: any) {
      logger.error('Error updating plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update plan',
        error: error.message
      });
    }
  }
);

// Pause plan
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
      
      const planRegistry = contractManager.getContract('planRegistry');
      
      const tx = await planRegistry.pausePlan(id);
      await tx.wait();
      
      logger.info(`Plan ${id} paused successfully`);
      
      res.json({
        success: true,
        message: 'Plan paused successfully',
        data: {
          transactionHash: tx.hash
        }
      });
    } catch (error: any) {
      logger.error('Error pausing plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to pause plan',
        error: error.message
      });
    }
  }
);

// Unpause plan
router.post('/:id/unpause',
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
      
      const planRegistry = contractManager.getContract('planRegistry');
      
      const tx = await planRegistry.unpausePlan(id);
      await tx.wait();
      
      logger.info(`Plan ${id} unpaused successfully`);
      
      res.json({
        success: true,
        message: 'Plan unpaused successfully',
        data: {
          transactionHash: tx.hash
        }
      });
    } catch (error: any) {
      logger.error('Error unpausing plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unpause plan',
        error: error.message
      });
    }
  }
);

export default router;
