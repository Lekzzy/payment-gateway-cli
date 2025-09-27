import { Router, Request, Response } from 'express';
import { MockApiService } from '../../utils/mockApi';
import { Invoice } from '../../types/index';

const router = Router();
const mockApi = MockApiService.getInstance();

/**
 * GET /invoices/:id
 * Fetch invoice details for hosted pay link UI
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Invoice ID is required'
      });
    }

    // Get invoice from mock API
    const result = await mockApi.getInvoice(id);

    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    const invoice = result.data;

    // Get plan details for additional context
    const planResult = await mockApi.getPlan(invoice.planId);
    const plan = planResult.success ? planResult.data : null;

    // Format response for hosted pay link UI
    const response = {
      success: true,
      data: {
        id: invoice.id,
        merchantName: 'Demo Merchant', // This would come from merchant config
        description: plan ? `${plan.name} - ${plan.description}` : 'Payment',
        planName: plan?.name || 'Unknown Plan',
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        wallet: invoice.wallet,
        customerEmail: invoice.metadata?.customerEmail,
        expiryTime: invoice.metadata?.expiresAt || invoice.dueDate,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        transactionHash: invoice.metadata?.transactionHash,
        paymentUrl: `https://pay.billing.test/pay/${invoice.id}`,
        metadata: invoice.metadata,
        plan: plan ? {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          currency: plan.currency,
          interval: plan.interval,
          features: plan.features
        } : null
      }
    };

    // Set appropriate cache headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(response);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /invoices/:id/status
 * Get invoice status for polling
 */
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Invoice ID is required'
      });
    }

    // Get invoice from mock API
    const result = await mockApi.getInvoice(id);

    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    const invoice = result.data;

    // Format status response
    const response = {
      success: true,
      data: {
        id: invoice.id,
        status: invoice.status,
        lastUpdated: invoice.updatedAt,
        transactionHash: invoice.metadata?.transactionHash,
        amount: invoice.amount,
        currency: invoice.currency,
        expiryTime: invoice.metadata?.expiresAt || invoice.dueDate,
        // Include additional status-specific information
        statusDetails: getStatusDetails(invoice)
      }
    };

    // Set cache headers for frequent polling
    res.set({
      'Cache-Control': 'no-cache, max-age=0',
      'Pragma': 'no-cache'
    });

    res.json(response);
  } catch (error) {
    console.error('Error fetching invoice status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /invoices/:id/simulate-payment
 * Simulate payment for testing (development only)
 */
router.post('/:id/simulate-payment', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { transactionHash } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Invoice ID is required'
      });
    }

    // Check if we're in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Payment simulation is only available in development mode'
      });
    }

    // Simulate payment
    const result = await mockApi.markInvoiceAsPaid(
      id, 
      transactionHash || `0x${Math.random().toString(16).substr(2, 64)}`
    );

    if (!result.success || !result.data) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to simulate payment'
      });
    }

    res.json({
      success: true,
      data: {
        id: result.data.id,
        status: result.data.status,
        transactionHash: result.data.metadata?.transactionHash,
        paidAt: result.data.updatedAt,
        message: 'Payment simulated successfully'
      }
    });
  } catch (error) {
    console.error('Error simulating payment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /invoices/:id/qr
 * Generate QR code for payment (future enhancement)
 */
router.get('/:id/qr', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { size = '200' } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Invoice ID is required'
      });
    }

    // Get invoice to verify it exists
    const result = await mockApi.getInvoice(id);

    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    const invoice = result.data;

    // For now, return a placeholder QR code URL
    // In a real implementation, this would generate an actual QR code
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(`https://pay.billing.test/pay/${id}`)}`;

    res.json({
      success: true,
      data: {
        qrCodeUrl,
        paymentUrl: `https://pay.billing.test/pay/${id}`,
        amount: invoice.amount,
        currency: invoice.currency,
        expiryTime: invoice.expiryTime
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Helper function to get status-specific details
 */
function getStatusDetails(invoice: Invoice): any {
  switch (invoice.status) {
    case 'unpaid':
      return {
        message: 'Waiting for payment',
        nextAction: 'Complete payment to proceed',
        timeRemaining: invoice.metadata?.expiresAt ? Math.max(0, new Date(invoice.metadata.expiresAt).getTime() - Date.now()) : null
      };
    
    case 'processing':
      return {
        message: 'Payment is being processed',
        nextAction: 'Please wait while we confirm your payment',
        estimatedConfirmationTime: '5-10 minutes'
      };
    
    case 'paid':
      return {
        message: 'Payment completed successfully',
        nextAction: 'Access granted',
        paidAt: invoice.updatedAt,
        transactionHash: invoice.metadata?.transactionHash
      };
    
    case 'failed':
      return {
        message: 'Payment failed',
        nextAction: 'Please try again or contact support',
        failureReason: invoice.metadata?.failureReason || 'Unknown error'
      };
    
    case 'cancelled':
      return {
        message: 'Invoice has been cancelled',
        nextAction: 'Please request a new invoice',
        cancelledAt: invoice.updatedAt
      };
    
    default:
      return {
        message: 'Unknown status',
        nextAction: 'Please contact support'
      };
  }
}

export default router;