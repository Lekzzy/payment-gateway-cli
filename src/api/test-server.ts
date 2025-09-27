import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { FixtureManager, SAMPLE_PLANS, SAMPLE_INVOICES, SAMPLE_REFUNDS, SAMPLE_WEBHOOK_EVENTS } from '../utils/fixtures';
import { WebhookVerifier } from '../utils/webhook';
import { Plan, Invoice, Refund, WebhookEvent } from '../types/index';

export class TestApiServer {
  private app: express.Application;
  private server: any;
  private port: number;
  private webhookVerifier: WebhookVerifier;
  
  // In-memory data stores (reset on restart)
  private plans: Plan[] = [...SAMPLE_PLANS];
  private invoices: Invoice[] = [...SAMPLE_INVOICES];
  private refunds: Refund[] = [...SAMPLE_REFUNDS];
  private webhookEvents: WebhookEvent[] = [...SAMPLE_WEBHOOK_EVENTS];

  constructor(port: number = 3002) {
    this.port = port;
    this.app = express();
    this.webhookVerifier = new WebhookVerifier('test_secret');
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    // API key validation (mock)
    this.app.use('/api/v1', (req, res, next) => {
      const rawApiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
      const apiKey = Array.isArray(rawApiKey) ? rawApiKey[0] : rawApiKey;
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: 'API key required',
          message: 'Please provide an API key in the X-API-Key header'
        });
      }

      // Mock API key validation
      if (!apiKey.startsWith('test_') && !apiKey.startsWith('live_')) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API key',
          message: 'API key must start with test_ or live_'
        });
      }

      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'test',
        data: {
          plans: this.plans.length,
          invoices: this.invoices.length,
          refunds: this.refunds.length,
          webhookEvents: this.webhookEvents.length
        }
      });
    });

    // API documentation
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'Billing System Test API',
        version: '1.0.0',
        description: 'Test API server with mock data for development and testing',
        endpoints: {
          plans: {
            'GET /api/v1/plans': 'List all plans',
            'GET /api/v1/plans/:id': 'Get plan by ID',
            'POST /api/v1/plans': 'Create new plan',
            'PUT /api/v1/plans/:id': 'Update plan',
            'DELETE /api/v1/plans/:id': 'Delete plan'
          },
          invoices: {
            'GET /api/v1/invoices': 'List all invoices',
            'GET /api/v1/invoices/:id': 'Get invoice by ID',
            'POST /api/v1/invoices': 'Create new invoice',
            'PUT /api/v1/invoices/:id': 'Update invoice',
            'POST /api/v1/invoices/:id/pay': 'Mark invoice as paid',
            'POST /api/v1/invoices/:id/cancel': 'Cancel invoice'
          },
          refunds: {
            'GET /api/v1/refunds': 'List all refunds',
            'GET /api/v1/refunds/:id': 'Get refund by ID',
            'POST /api/v1/refunds': 'Create new refund',
            'PUT /api/v1/refunds/:id': 'Update refund status'
          },
          webhooks: {
            'GET /api/v1/webhooks/events': 'List webhook events',
            'POST /api/v1/webhooks/test': 'Send test webhook',
            'POST /api/v1/webhooks/verify': 'Verify webhook signature'
          },
          utilities: {
            'POST /api/v1/test/reset': 'Reset all data to defaults',
            'POST /api/v1/test/generate': 'Generate random test data',
            'GET /api/v1/test/fixtures': 'Get all fixture data'
          }
        }
      });
    });

    this.setupPlanRoutes();
    this.setupInvoiceRoutes();
    this.setupRefundRoutes();
    this.setupWebhookRoutes();
    this.setupTestUtilityRoutes();
  }

  private setupPlanRoutes(): void {
    // List plans
    this.app.get('/api/v1/plans', (req: Request, res: Response) => {
      const { active, tier, limit, offset } = req.query;
      
      let filteredPlans = [...this.plans];
      
      if (active !== undefined) {
        filteredPlans = filteredPlans.filter(plan => plan.active === (active === 'true'));
      }
      
      if (tier) {
        filteredPlans = filteredPlans.filter(plan => plan.metadata?.tier === tier);
      }
      
      const totalCount = filteredPlans.length;
      const startIndex = parseInt(offset as string) || 0;
      const limitCount = parseInt(limit as string) || 50;
      
      const paginatedPlans = filteredPlans.slice(startIndex, startIndex + limitCount);
      
      res.json({
        success: true,
        data: paginatedPlans,
        pagination: {
          total: totalCount,
          offset: startIndex,
          limit: limitCount,
          hasMore: startIndex + limitCount < totalCount
        }
      });
    });

    // Get plan by ID
    this.app.get('/api/v1/plans/:id', (req: Request, res: Response) => {
      const plan = this.plans.find(p => p.id === req.params.id);
      
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found',
          message: `Plan with ID ${req.params.id} does not exist`
        });
      }
      
      res.json({
        success: true,
        data: plan
      });
    });

    // Create plan
    this.app.post('/api/v1/plans', (req: Request, res: Response) => {
      const { name, description, price, currency, interval, intervalCount, trialDays, features, metadata } = req.body;
      
      if (!name || !price || !currency || !interval) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'name, price, currency, and interval are required'
        });
      }
      
      const newPlan: Plan = {
        id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        description: description || '',
        price: parseFloat(price),
        currency: currency.toUpperCase(),
        interval,
        intervalCount: intervalCount || 1,
        trialDays: trialDays || 0,
        features: features || [],
        metadata: metadata || {},
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.plans.push(newPlan);
      
      res.status(201).json({
        success: true,
        data: newPlan,
        message: 'Plan created successfully'
      });
    });

    // Update plan
    this.app.put('/api/v1/plans/:id', (req: Request, res: Response) => {
      const planIndex = this.plans.findIndex(p => p.id === req.params.id);
      
      if (planIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }
      
      const updatedPlan = {
        ...this.plans[planIndex],
        ...req.body,
        id: req.params.id, // Prevent ID changes
        updatedAt: new Date().toISOString()
      };
      
      this.plans[planIndex] = updatedPlan;
      
      res.json({
        success: true,
        data: updatedPlan,
        message: 'Plan updated successfully'
      });
    });

    // Delete plan
    this.app.delete('/api/v1/plans/:id', (req: Request, res: Response) => {
      const planIndex = this.plans.findIndex(p => p.id === req.params.id);
      
      if (planIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }
      
      this.plans.splice(planIndex, 1);
      
      res.json({
        success: true,
        message: 'Plan deleted successfully'
      });
    });
  }

  private setupInvoiceRoutes(): void {
    // List invoices
    this.app.get('/api/v1/invoices', (req: Request, res: Response) => {
      const { status, planId, limit, offset } = req.query;
      
      let filteredInvoices = [...this.invoices];
      
      if (status) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.status === status);
      }
      
      if (planId) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.planId === planId);
      }
      
      const totalCount = filteredInvoices.length;
      const startIndex = parseInt(offset as string) || 0;
      const limitCount = parseInt(limit as string) || 50;
      
      const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + limitCount);
      
      res.json({
        success: true,
        data: paginatedInvoices,
        pagination: {
          total: totalCount,
          offset: startIndex,
          limit: limitCount,
          hasMore: startIndex + limitCount < totalCount
        }
      });
    });

    // Get invoice by ID
    this.app.get('/api/v1/invoices/:id', (req: Request, res: Response) => {
      const invoice = this.invoices.find(i => i.id === req.params.id);
      
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }
      
      res.json({
        success: true,
        data: invoice
      });
    });

    // Create invoice
    this.app.post('/api/v1/invoices', (req: Request, res: Response) => {
      const { planId, amount, currency, dueDate, metadata } = req.body;
      
      if (!planId || !amount || !currency) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'planId, amount, and currency are required'
        });
      }
      
      const plan = this.plans.find(p => p.id === planId);
      if (!plan) {
        return res.status(400).json({
          success: false,
          error: 'Invalid plan ID'
        });
      }
      
      const newInvoice: Invoice = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        planId,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        status: 'pending',
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        paymentUrl: `https://pay.example.com/inv_${Date.now()}`,
        metadata: metadata || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.invoices.push(newInvoice);
      
      res.status(201).json({
        success: true,
        data: newInvoice,
        message: 'Invoice created successfully'
      });
    });

    // Mark invoice as paid
    this.app.post('/api/v1/invoices/:id/pay', (req: Request, res: Response) => {
      const invoiceIndex = this.invoices.findIndex(i => i.id === req.params.id);
      
      if (invoiceIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }
      
      const invoice = this.invoices[invoiceIndex];
      
      if (invoice.status === 'paid') {
        return res.status(400).json({
          success: false,
          error: 'Invoice already paid'
        });
      }
      
      this.invoices[invoiceIndex] = {
        ...invoice,
        status: 'paid',
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Create webhook event
      const webhookEvent = FixtureManager.createRandomWebhookEvent('invoice.paid', {
        data: {
          invoice: this.invoices[invoiceIndex],
          plan: this.plans.find(p => p.id === invoice.planId),
          customer: {
            email: invoice.metadata?.customerEmail,
            discordUserId: invoice.metadata?.discordUserId
          }
        }
      });
      
      this.webhookEvents.push(webhookEvent);
      
      res.json({
        success: true,
        data: this.invoices[invoiceIndex],
        message: 'Invoice marked as paid'
      });
    });

    // Cancel invoice
    this.app.post('/api/v1/invoices/:id/cancel', (req: Request, res: Response) => {
      const invoiceIndex = this.invoices.findIndex(i => i.id === req.params.id);
      
      if (invoiceIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }
      
      const invoice = this.invoices[invoiceIndex];
      
      if (invoice.status === 'paid') {
        return res.status(400).json({
          success: false,
          error: 'Cannot cancel paid invoice'
        });
      }
      
      this.invoices[invoiceIndex] = {
        ...invoice,
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: this.invoices[invoiceIndex],
        message: 'Invoice cancelled successfully'
      });
    });
  }

  private setupRefundRoutes(): void {
    // List refunds
    this.app.get('/api/v1/refunds', (req: Request, res: Response) => {
      const { status, invoiceId, limit, offset } = req.query;
      
      let filteredRefunds = [...this.refunds];
      
      if (status) {
        filteredRefunds = filteredRefunds.filter(refund => refund.status === status);
      }
      
      if (invoiceId) {
        filteredRefunds = filteredRefunds.filter(refund => refund.invoiceId === invoiceId);
      }
      
      const totalCount = filteredRefunds.length;
      const startIndex = parseInt(offset as string) || 0;
      const limitCount = parseInt(limit as string) || 50;
      
      const paginatedRefunds = filteredRefunds.slice(startIndex, startIndex + limitCount);
      
      res.json({
        success: true,
        data: paginatedRefunds,
        pagination: {
          total: totalCount,
          offset: startIndex,
          limit: limitCount,
          hasMore: startIndex + limitCount < totalCount
        }
      });
    });

    // Get refund by ID
    this.app.get('/api/v1/refunds/:id', (req: Request, res: Response) => {
      const refund = this.refunds.find(r => r.id === req.params.id);
      
      if (!refund) {
        return res.status(404).json({
          success: false,
          error: 'Refund not found'
        });
      }
      
      res.json({
        success: true,
        data: refund
      });
    });

    // Create refund
    this.app.post('/api/v1/refunds', (req: Request, res: Response) => {
      const { invoiceId, amount, reason, metadata } = req.body;
      
      if (!invoiceId || !amount || !reason) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'invoiceId, amount, and reason are required'
        });
      }
      
      const invoice = this.invoices.find(i => i.id === invoiceId);
      if (!invoice) {
        return res.status(400).json({
          success: false,
          error: 'Invalid invoice ID'
        });
      }
      
      if (invoice.status !== 'paid') {
        return res.status(400).json({
          success: false,
          error: 'Can only refund paid invoices'
        });
      }
      
      const newRefund: Refund = {
        id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        invoiceId,
        amount: parseFloat(amount),
        currency: invoice.currency,
        reason,
        status: 'pending',
        metadata: metadata || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.refunds.push(newRefund);
      
      res.status(201).json({
        success: true,
        data: newRefund,
        message: 'Refund created successfully'
      });
    });

    // Update refund status
    this.app.put('/api/v1/refunds/:id', (req: Request, res: Response) => {
      const refundIndex = this.refunds.findIndex(r => r.id === req.params.id);
      
      if (refundIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Refund not found'
        });
      }
      
      const { status } = req.body;
      
      if (!status || !['pending', 'completed', 'failed'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
          message: 'Status must be pending, completed, or failed'
        });
      }
      
      const refund = this.refunds[refundIndex];
      this.refunds[refundIndex] = {
        ...refund,
        status,
        processedAt: status === 'completed' ? new Date().toISOString() : refund.processedAt,
        updatedAt: new Date().toISOString()
      };
      
      // Create webhook event for completed refunds
      if (status === 'completed') {
        const invoice = this.invoices.find(i => i.id === refund.invoiceId);
        const plan = this.plans.find(p => p.id === invoice?.planId);
        
        const webhookEvent = FixtureManager.createRandomWebhookEvent('refund.completed', {
          data: {
            refund: this.refunds[refundIndex],
            invoice,
            plan
          }
        });
        
        this.webhookEvents.push(webhookEvent);
      }
      
      res.json({
        success: true,
        data: this.refunds[refundIndex],
        message: 'Refund updated successfully'
      });
    });
  }

  private setupWebhookRoutes(): void {
    // List webhook events
    this.app.get('/api/v1/webhooks/events', (req: Request, res: Response) => {
      const { type, limit, offset } = req.query;
      
      let filteredEvents = [...this.webhookEvents];
      
      if (type) {
        filteredEvents = filteredEvents.filter(event => event.type === type);
      }
      
      // Sort by timestamp (newest first)
      filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const totalCount = filteredEvents.length;
      const startIndex = parseInt(offset as string) || 0;
      const limitCount = parseInt(limit as string) || 50;
      
      const paginatedEvents = filteredEvents.slice(startIndex, startIndex + limitCount);
      
      res.json({
        success: true,
        data: paginatedEvents,
        pagination: {
          total: totalCount,
          offset: startIndex,
          limit: limitCount,
          hasMore: startIndex + limitCount < totalCount
        }
      });
    });

    // Send test webhook
    this.app.post('/api/v1/webhooks/test', async (req: Request, res: Response) => {
      const { url, eventType, secret, data } = req.body;
      
      if (!url || !eventType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'url and eventType are required'
        });
      }
      
      try {
        const webhookEvent = data ? 
          { ...FixtureManager.createRandomWebhookEvent(eventType), data } :
          FixtureManager.createRandomWebhookEvent(eventType);
        
        const payload = JSON.stringify(webhookEvent);
        const timestamp = Date.now().toString();
        const signature = this.webhookVerifier.generateSignature(payload, timestamp);
        
        // In a real implementation, you would send this to the URL
        // For testing, we'll just return the webhook data
        
        this.webhookEvents.push(webhookEvent);
        
        res.json({
          success: true,
          message: 'Test webhook created',
          data: {
            event: webhookEvent,
            headers: {
              'X-Signature': signature,
              'X-Timestamp': timestamp,
              'Content-Type': 'application/json'
            },
            payload
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to create test webhook',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Verify webhook signature
    this.app.post('/api/v1/webhooks/verify', async (req: Request, res: Response) => {
      const { payload, signature, timestamp, secret } = req.body;
      
      if (!payload || !signature || !timestamp || !secret) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'payload, signature, timestamp, and secret are required'
        });
      }
      
      try {
        const verification = await this.webhookVerifier.verifyWebhook(payload, signature, timestamp, secret);
        
        res.json({
          success: true,
          data: verification
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Verification failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  private setupTestUtilityRoutes(): void {
    // Reset all data
    this.app.post('/api/v1/test/reset', (req: Request, res: Response) => {
      this.plans = [...SAMPLE_PLANS];
      this.invoices = [...SAMPLE_INVOICES];
      this.refunds = [...SAMPLE_REFUNDS];
      this.webhookEvents = [...SAMPLE_WEBHOOK_EVENTS];
      
      res.json({
        success: true,
        message: 'All data reset to defaults',
        data: {
          plans: this.plans.length,
          invoices: this.invoices.length,
          refunds: this.refunds.length,
          webhookEvents: this.webhookEvents.length
        }
      });
    });

    // Generate random test data
    this.app.post('/api/v1/test/generate', (req: Request, res: Response) => {
      const { invoices = 10, refunds = 5, events = 15 } = req.body;
      
      const generated = FixtureManager.generateBulkData({
        invoices: parseInt(invoices),
        refunds: parseInt(refunds),
        events: parseInt(events)
      });
      
      // Add generated data to existing data
      this.invoices.push(...generated.invoices.slice(SAMPLE_INVOICES.length));
      this.refunds.push(...generated.refunds.slice(SAMPLE_REFUNDS.length));
      this.webhookEvents.push(...generated.events.slice(SAMPLE_WEBHOOK_EVENTS.length));
      
      res.json({
        success: true,
        message: 'Random test data generated',
        generated: {
          invoices: generated.invoices.length - SAMPLE_INVOICES.length,
          refunds: generated.refunds.length - SAMPLE_REFUNDS.length,
          events: generated.events.length - SAMPLE_WEBHOOK_EVENTS.length
        },
        totals: {
          plans: this.plans.length,
          invoices: this.invoices.length,
          refunds: this.refunds.length,
          webhookEvents: this.webhookEvents.length
        }
      });
    });

    // Get all fixture data
    this.app.get('/api/v1/test/fixtures', (req: Request, res: Response) => {
      res.json({
        success: true,
        data: {
          plans: this.plans,
          invoices: this.invoices,
          refunds: this.refunds,
          webhookEvents: this.webhookEvents
        },
        counts: {
          plans: this.plans.length,
          invoices: this.invoices.length,
          refunds: this.refunds.length,
          webhookEvents: this.webhookEvents.length
        }
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`🧪 Test API Server running on port ${this.port}`);
        console.log(`📋 API Documentation: http://localhost:${this.port}/`);
        console.log(`🏥 Health Check: http://localhost:${this.port}/health`);
        console.log(`🔧 Test Utilities: http://localhost:${this.port}/api/v1/test/`);
        resolve();
      });

      this.server.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('Test API Server stopped');
          resolve();
        });
      });
    }
  }

  getStatus() {
    return {
      running: !!this.server,
      port: this.port,
      data: {
        plans: this.plans.length,
        invoices: this.invoices.length,
        refunds: this.refunds.length,
        webhookEvents: this.webhookEvents.length
      }
    };
  }
}