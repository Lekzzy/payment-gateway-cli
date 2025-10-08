import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { ethers } from 'ethers';
import contractManager from '../config/contracts';
import { validateRequest, validateAddress, validateUint256, validateId } from '../middleware/validation';
import logger from '../utils/logger';

const router = express.Router();

interface ProcessQuoteRequest {
  subscriptionId: number;
  tokenAmount: string;
  expiry: number;
  invoiceId: number;
  signature: string;
}

interface RefundRequest {
  subscriptionId: number;
  subscriber: string;
  amount: string;
  token: string;
}

interface CalculateTokenAmountRequest {
  token: string;
  priceInCents: number;
}

interface GenerateSignatureRequest {
  subscriptionId: number;
  subscriber: string;
  payerToken: string;
  tokenAmount: string;
  expiry: number;
  invoiceId: number;
}

// Process regular charge
router.post('/process/:subscriptionId',
  validateId('subscriptionId'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      
      if (!contractManager.getWallet()) {
        return res.status(403).json({
          success: false,
          message: 'Wallet not available - read-only mode'
        });
      }
      
      const chargeProcessor = contractManager.getContract('chargeProcessor');
      
      const tx = await chargeProcessor.processCharge(subscriptionId);
      const receipt = await tx.wait();
      
      // Extract charge details from events
      const chargeSucceededEvent = receipt.events?.find((e: any) => e.event === 'ChargeSucceeded');
      
      logger.info(`Charge processed for subscription ${subscriptionId}`);
      
      res.json({
        success: true,
        message: 'Charge processed successfully',
        data: {
          subscriptionId,
          transactionHash: tx.hash,
          gasUsed: receipt.gasUsed.toString(),
          events: {
            chargeSucceeded: chargeSucceededEvent ? {
              subscriber: chargeSucceededEvent.args.subscriber,
              merchant: chargeSucceededEvent.args.merchant,
              amount: chargeSucceededEvent.args.amount.toString(),
              token: chargeSucceededEvent.args.token,
              platformFee: chargeSucceededEvent.args.platformFee.toString()
            } : null
          }
        }
      });
    } catch (error: any) {
      logger.error('Error processing charge:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process charge',
        error: error.message
      });
    }
  }
);

// Process charge with signed quote
router.post('/process-quote',
  [
    body('subscriptionId').isNumeric().withMessage('Subscription ID must be a number'),
    body('tokenAmount').isNumeric().withMessage('Token amount must be a number'),
    body('expiry').isNumeric().withMessage('Expiry must be a number'),
    body('invoiceId').isNumeric().withMessage('Invoice ID must be a number'),
    body('signature').notEmpty().withMessage('Signature is required')
  ],
  validateRequest,
  async (req: Request<{}, {}, ProcessQuoteRequest>, res: Response) => {
    try {
      const { subscriptionId, tokenAmount, expiry, invoiceId, signature } = req.body;
      
      if (!contractManager.getWallet()) {
        return res.status(403).json({
          success: false,
          message: 'Wallet not available - read-only mode'
        });
      }
      
      const chargeProcessor = contractManager.getContract('chargeProcessor');
      
      const tx = await chargeProcessor.processChargeWithQuote(
        subscriptionId,
        tokenAmount,
        expiry,
        invoiceId,
        signature
      );
      const receipt = await tx.wait();
      
      // Extract charge details from events
      const chargeSucceededEvent = receipt.events?.find((e: any) => e.event === 'ChargeSucceeded');
      
      logger.info(`Charge with quote processed for subscription ${subscriptionId}`);
      
      res.json({
        success: true,
        message: 'Charge with quote processed successfully',
        data: {
          subscriptionId,
          transactionHash: tx.hash,
          gasUsed: receipt.gasUsed.toString(),
          events: {
            chargeSucceeded: chargeSucceededEvent ? {
              subscriber: chargeSucceededEvent.args.subscriber,
              merchant: chargeSucceededEvent.args.merchant,
              amount: chargeSucceededEvent.args.amount.toString(),
              token: chargeSucceededEvent.args.token,
              platformFee: chargeSucceededEvent.args.platformFee.toString()
            } : null
          }
        }
      });
    } catch (error: any) {
      logger.error('Error processing charge with quote:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process charge with quote',
        error: error.message
      });
    }
  }
);

// Issue refund
router.post('/refund',
  [
    body('subscriptionId').isNumeric().withMessage('Subscription ID must be a number'),
    body('subscriber').isEthereumAddress().withMessage('Subscriber must be a valid address'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('token').isEthereumAddress().withMessage('Token must be a valid address')
  ],
  validateRequest,
  async (req: Request<{}, {}, RefundRequest>, res: Response) => {
    try {
      const { subscriptionId, subscriber, amount, token } = req.body;
      
      if (!contractManager.getWallet()) {
        return res.status(403).json({
          success: false,
          message: 'Wallet not available - read-only mode'
        });
      }
      
      const chargeProcessor = contractManager.getContract('chargeProcessor');
      
      const tx = await chargeProcessor.issueRefund(subscriptionId, subscriber, amount, token);
      const receipt = await tx.wait();
      
      logger.info(`Refund issued for subscription ${subscriptionId}`);
      
      res.json({
        success: true,
        message: 'Refund issued successfully',
        data: {
          subscriptionId,
          transactionHash: tx.hash,
          gasUsed: receipt.gasUsed.toString()
        }
      });
    } catch (error: any) {
      logger.error('Error issuing refund:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to issue refund',
        error: error.message
      });
    }
  }
);

// Get token amount for USD price
router.post('/calculate-token-amount',
  [
    body('token').isEthereumAddress().withMessage('Token must be a valid address'),
    body('priceInCents').isNumeric().withMessage('Price in cents must be a number')
  ],
  validateRequest,
  async (req: Request<{}, {}, CalculateTokenAmountRequest>, res: Response) => {
    try {
      const { token, priceInCents } = req.body;
      
      const chargeProcessor = contractManager.getContract('chargeProcessor');
      
      // This would require a view function in the contract to calculate token amount
      // For now, we'll return a placeholder response
      res.json({
        success: true,
        message: 'Token amount calculation not implemented yet',
        data: {
          token,
          priceInCents,
          note: 'This endpoint requires a view function in the ChargeProcessor contract'
        }
      });
    } catch (error: any) {
      logger.error('Error calculating token amount:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate token amount',
        error: error.message
      });
    }
  }
);

// Generate signature for quote (helper endpoint)
router.post('/generate-quote-signature',
  [
    body('subscriptionId').isNumeric().withMessage('Subscription ID must be a number'),
    body('subscriber').isEthereumAddress().withMessage('Subscriber must be a valid address'),
    body('payerToken').isEthereumAddress().withMessage('Payer token must be a valid address'),
    body('tokenAmount').isNumeric().withMessage('Token amount must be a number'),
    body('expiry').isNumeric().withMessage('Expiry must be a number'),
    body('invoiceId').isNumeric().withMessage('Invoice ID must be a number')
  ],
  validateRequest,
  async (req: Request<{}, {}, GenerateSignatureRequest>, res: Response) => {
    try {
      const { subscriptionId, subscriber, payerToken, tokenAmount, expiry, invoiceId } = req.body;
      
      if (!contractManager.getWallet()) {
        return res.status(403).json({
          success: false,
          message: 'Wallet not available - read-only mode'
        });
      }
      
      const chargeProcessor = contractManager.getContract('chargeProcessor');
      const provider = contractManager.getProvider();
      const chainId = (await provider!.getNetwork()).chainId;
      
      // Create the domain-bound payload
      const payload = ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'uint256', 'address', 'address', 'uint256', 'uint256', 'uint256'],
        [chargeProcessor.address, chainId, subscriptionId, subscriber, payerToken, tokenAmount, expiry, invoiceId]
      );
      
      const hash = ethers.utils.keccak256(payload);
      const signature = await contractManager.getWallet()!.signMessage(ethers.utils.arrayify(hash));
      
      res.json({
        success: true,
        message: 'Signature generated successfully',
        data: {
          signature,
          payload: hash,
          chainId: chainId.toString()
        }
      });
    } catch (error: any) {
      logger.error('Error generating signature:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate signature',
        error: error.message
      });
    }
  }
);

export default router;
