import request from 'supertest';
import { TestApiServer } from '../api/test-server';
import { Plan, Invoice, Refund } from '../types/index';

describe('Test API Server Integration', () => {
  let server: TestApiServer;
  let app: any;
  const apiKey = 'test_12345';

  beforeAll(async () => {
    server = new TestApiServer(0); // Use random port
    await server.start();
    app = (server as any).app; // Access the Express app for testing
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(async () => {
    // Reset data before each test
    await request(app)
      .post('/api/v1/test/reset')
      .set('X-API-Key', apiKey)
      .expect(200);
  });

  describe('Authentication', () => {
    it('should require API key for protected endpoints', async () => {
      await request(app)
        .get('/api/v1/plans')
        .expect(401)
        .expect((res) => {
          expect(res.body.error).toBe('API key required');
        });
    });

    it('should validate API key format', async () => {
      await request(app)
        .get('/api/v1/plans')
        .set('X-API-Key', 'invalid_key')
        .expect(401)
        .expect((res) => {
          expect(res.body.error).toBe('Invalid API key');
        });
    });

    it('should accept valid API keys', async () => {
      await request(app)
        .get('/api/v1/plans')
        .set('X-API-Key', 'test_12345')
        .expect(200);

      await request(app)
        .get('/api/v1/plans')
        .set('X-API-Key', 'live_67890')
        .expect(200);
    });

    it('should accept Authorization header', async () => {
      await request(app)
        .get('/api/v1/plans')
        .set('Authorization', 'Bearer test_12345')
        .expect(200);
    });
  });

  describe('Health and Documentation', () => {
    it('should return health status', async () => {
      await request(app)
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('healthy');
          expect(res.body.data).toHaveProperty('plans');
          expect(res.body.data).toHaveProperty('invoices');
        });
    });

    it('should return API documentation', async () => {
      await request(app)
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Billing System Test API');
          expect(res.body.endpoints).toHaveProperty('plans');
          expect(res.body.endpoints).toHaveProperty('invoices');
        });
    });
  });

  describe('Plans API', () => {
    it('should list plans', async () => {
      await request(app)
        .get('/api/v1/plans')
        .set('X-API-Key', apiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.pagination).toHaveProperty('total');
        });
    });

    it('should get plan by ID', async () => {
      // First get list of plans
      const listResponse = await request(app)
        .get('/api/v1/plans')
        .set('X-API-Key', apiKey)
        .expect(200);

      const planId = listResponse.body.data[0].id;

      await request(app)
        .get(`/api/v1/plans/${planId}`)
        .set('X-API-Key', apiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(planId);
        });
    });

    it('should return 404 for non-existent plan', async () => {
      await request(app)
        .get('/api/v1/plans/non_existent_id')
        .set('X-API-Key', apiKey)
        .expect(404)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('Plan not found');
        });
    });

    it('should create a new plan', async () => {
      const planData = {
        name: 'Test Plan',
        description: 'A test plan',
        price: 29.99,
        currency: 'USD',
        interval: 'month',
        intervalCount: 1,
        trialDays: 7,
        features: ['Feature 1', 'Feature 2'],
        metadata: { tier: 'basic' }
      };

      await request(app)
        .post('/api/v1/plans')
        .set('X-API-Key', apiKey)
        .send(planData)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('Test Plan');
          expect(res.body.data.price).toBe(29.99);
          expect(res.body.data.id).toMatch(/^plan_/);
        });
    });

    it('should validate required fields when creating plan', async () => {
      await request(app)
        .post('/api/v1/plans')
        .set('X-API-Key', apiKey)
        .send({ name: 'Incomplete Plan' })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('Missing required fields');
        });
    });

    it('should update a plan', async () => {
      // Get existing plan
      const listResponse = await request(app)
        .get('/api/v1/plans')
        .set('X-API-Key', apiKey);

      const planId = listResponse.body.data[0].id;

      await request(app)
        .put(`/api/v1/plans/${planId}`)
        .set('X-API-Key', apiKey)
        .send({ name: 'Updated Plan Name' })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('Updated Plan Name');
          expect(res.body.data.id).toBe(planId);
        });
    });

    it('should delete a plan', async () => {
      // Create a plan first
      const createResponse = await request(app)
        .post('/api/v1/plans')
        .set('X-API-Key', apiKey)
        .send({
          name: 'Plan to Delete',
          price: 10,
          currency: 'USD',
          interval: 'month'
        });

      const planId = createResponse.body.data.id;

      await request(app)
        .delete(`/api/v1/plans/${planId}`)
        .set('X-API-Key', apiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      // Verify plan is deleted
      await request(app)
        .get(`/api/v1/plans/${planId}`)
        .set('X-API-Key', apiKey)
        .expect(404);
    });

    it('should filter plans by active status', async () => {
      await request(app)
        .get('/api/v1/plans?active=true')
        .set('X-API-Key', apiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          res.body.data.forEach((plan: Plan) => {
            expect(plan.active).toBe(true);
          });
        });
    });

    it('should paginate plans', async () => {
      await request(app)
        .get('/api/v1/plans?limit=2&offset=0')
        .set('X-API-Key', apiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.length).toBeLessThanOrEqual(2);
          expect(res.body.pagination.limit).toBe(2);
          expect(res.body.pagination.offset).toBe(0);
        });
    });
  });

  describe('Invoices API', () => {
    let testPlanId: string;

    beforeEach(async () => {
      // Get a plan ID for testing
      const plansResponse = await request(app)
        .get('/api/v1/plans')
        .set('X-API-Key', apiKey);
      testPlanId = plansResponse.body.data[0].id;
    });

    it('should list invoices', async () => {
      await request(app)
        .get('/api/v1/invoices')
        .set('X-API-Key', apiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.pagination).toHaveProperty('total');
        });
    });

    it('should create a new invoice', async () => {
      const invoiceData = {
        planId: testPlanId,
        amount: 29.99,
        currency: 'USD',
        metadata: { customerEmail: 'test@example.com' }
      };

      await request(app)
        .post('/api/v1/invoices')
        .set('X-API-Key', apiKey)
        .send(invoiceData)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.planId).toBe(testPlanId);
          expect(res.body.data.amount).toBe(29.99);
          expect(res.body.data.status).toBe('pending');
          expect(res.body.data.id).toMatch(/^inv_/);
        });
    });

    it('should validate plan ID when creating invoice', async () => {
      await request(app)
        .post('/api/v1/invoices')
        .set('X-API-Key', apiKey)
        .send({
          planId: 'non_existent_plan',
          amount: 29.99,
          currency: 'USD'
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('Invalid plan ID');
        });
    });

    it('should mark invoice as paid', async () => {
      // Create an invoice first
      const createResponse = await request(app)
        .post('/api/v1/invoices')
        .set('X-API-Key', apiKey)
        .send({
          planId: testPlanId,
          amount: 29.99,
          currency: 'USD'
        });

      const invoiceId = createResponse.body.data.id;

      await request(app)
        .post(`/api/v1/invoices/${invoiceId}/pay`)
        .set('X-API-Key', apiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe('paid');
          expect(res.body.data.paidAt).toBeDefined();
        });
    });

    it('should not allow paying already paid invoice', async () => {
      // Get a paid invoice
      const invoicesResponse = await request(app)
        .get('/api/v1/invoices?status=paid')
        .set('X-API-Key', apiKey);

      if (invoicesResponse.body.data.length > 0) {
        const invoiceId = invoicesResponse.body.data[0].id;

        await request(app)
          .post(`/api/v1/invoices/${invoiceId}/pay`)
          .set('X-API-Key', apiKey)
          .expect(400)
          .expect((res) => {
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Invoice already paid');
          });
      }
    });

    it('should cancel an invoice', async () => {
      // Create an invoice first
      const createResponse = await request(app)
        .post('/api/v1/invoices')
        .set('X-API-Key', apiKey)
        .send({
          planId: testPlanId,
          amount: 29.99,
          currency: 'USD'
        });

      const invoiceId = createResponse.body.data.id;

      await request(app)
        .post(`/api/v1/invoices/${invoiceId}/cancel`)
        .set('X-API-Key', apiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe('cancelled');
        });
    });

    it('should filter invoices by status', async () => {
      await request(app)
        .get('/api/v1/invoices?status=pending')
        .set('X-API-Key', apiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          res.body.data.forEach((invoice: Invoice) => {
            expect(invoice.status).toBe('pending');
          });
        });
    });
  });

  describe('Refunds API', () => {
    let testInvoiceId: string;

    beforeEach(async () => {
      // Create and pay an invoice for testing refunds
      const plansResponse = await request(app)
        .get('/api/v1/plans')
        .set('X-API-Key', apiKey);
      const planId = plansResponse.body.data[0].id;

      const createResponse = await request(app)
        .post('/api/v1/invoices')
        .set('X-API-Key', apiKey)
        .send({
          planId,
          amount: 29.99,
          currency: 'USD'
        });

      const invoiceId = createResponse.body.data.id;

      await request(app)
        .post(`/api/v1/invoices/${invoiceId}/pay`)
        .set('X-API-Key', apiKey);

      testInvoiceId = invoiceId;
    });

    it('should list refunds', async () => {
      await request(app)
        .get('/api/v1/refunds')
        .set('X-API-Key', apiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should create a refund', async () => {
      const refundData = {
        invoiceId: testInvoiceId,
        amount: 29.99,
        reason: 'Customer request'
      };

      await request(app)
        .post('/api/v1/refunds')
        .set('X-API-Key', apiKey)
        .send(refundData)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.invoiceId).toBe(testInvoiceId);
          expect(res.body.data.amount).toBe(29.99);
          expect(res.body.data.status).toBe('pending');
          expect(res.body.data.id).toMatch(/^ref_/);
        });
    });

    it('should not allow refund for unpaid invoice', async () => {
      // Create an unpaid invoice
      const plansResponse = await request(app)
        .get('/api/v1/plans')
        .set('X-API-Key', apiKey);
      const planId = plansResponse.body.data[0].id;

      const createResponse = await request(app)
        .post('/api/v1/invoices')
        .set('X-API-Key', apiKey)
        .send({
          planId,
          amount: 29.99,
          currency: 'USD'
        });

      const unpaidInvoiceId = createResponse.body.data.id;

      await request(app)
        .post('/api/v1/refunds')
        .set('X-API-Key', apiKey)
        .send({
          invoiceId: unpaidInvoiceId,
          amount: 29.99,
          reason: 'Test'
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('Can only refund paid invoices');
        });
    });

    it('should update refund status', async () => {
      // Create a refund first
      const createResponse = await request(app)
        .post('/api/v1/refunds')
        .set('X-API-Key', apiKey)
        .send({
          invoiceId: testInvoiceId,
          amount: 29.99,
          reason: 'Test refund'
        });

      const refundId = createResponse.body.data.id;

      await request(app)
        .put(`/api/v1/refunds/${refundId}`)
        .set('X-API-Key', apiKey)
        .send({ status: 'completed' })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe('completed');
          expect(res.body.data.processedAt).toBeDefined();
        });
    });
  });

  describe('Webhooks API', () => {
    it('should list webhook events', async () => {
      await request(app)
        .get('/api/v1/webhooks/events')
        .set('X-API-Key', apiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should create test webhook', async () => {
      const webhookData = {
        url: 'https://httpbin.org/post',
        eventType: 'invoice.paid',
        secret: 'test_secret'
      };

      await request(app)
        .post('/api/v1/webhooks/test')
        .set('X-API-Key', apiKey)
        .send(webhookData)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.event.type).toBe('invoice.paid');
          expect(res.body.data.headers).toHaveProperty('X-Signature');
        });
    });

    it('should verify webhook signature', async () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test_secret';
      const timestamp = Date.now().toString();

      // First generate a signature
      const testResponse = await request(app)
        .post('/api/v1/webhooks/test')
        .set('X-API-Key', apiKey)
        .send({
          url: 'https://example.com',
          eventType: 'invoice.paid',
          secret,
          data: { test: 'data' }
        });

      const signature = testResponse.body.data.headers['X-Signature'];

      await request(app)
        .post('/api/v1/webhooks/verify')
        .set('X-API-Key', apiKey)
        .send({
          payload: testResponse.body.data.payload,
          signature,
          timestamp: testResponse.body.data.headers['X-Timestamp'],
          secret
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('Test Utilities', () => {
    it('should reset data to defaults', async () => {
      await request(app)
        .post('/api/v1/test/reset')
        .set('X-API-Key', apiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('All data reset to defaults');
          expect(res.body.data).toHaveProperty('plans');
        });
    });

    it('should generate random test data', async () => {
      await request(app)
        .post('/api/v1/test/generate')
        .set('X-API-Key', apiKey)
        .send({
          invoices: 5,
          refunds: 2,
          events: 10
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.generated).toHaveProperty('invoices');
          expect(res.body.totals).toHaveProperty('invoices');
        });
    });

    it('should get all fixture data', async () => {
      await request(app)
        .get('/api/v1/test/fixtures')
        .set('X-API-Key', apiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('plans');
          expect(res.body.data).toHaveProperty('invoices');
          expect(res.body.counts).toHaveProperty('plans');
        });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/v1/plans')
        .set('X-API-Key', apiKey)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle large payloads', async () => {
      const largeData = {
        name: 'Test Plan',
        description: 'A'.repeat(10000), // Large description
        price: 29.99,
        currency: 'USD',
        interval: 'month'
      };

      await request(app)
        .post('/api/v1/plans')
        .set('X-API-Key', apiKey)
        .send(largeData)
        .expect(201);
    });
  });
});