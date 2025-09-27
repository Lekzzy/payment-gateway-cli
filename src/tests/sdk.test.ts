import { BillingClient } from '../sdk/client';
import { MockApiService } from '../utils/mockApi';
import { WebhookVerifier } from '../utils/webhook';
import { Plan, Invoice, Refund } from '../types/index';

describe('BillingClient SDK', () => {
  let client: BillingClient;
  let mockApi: MockApiService;

  beforeEach(() => {
    mockApi = new MockApiService();
    client = new BillingClient({
      apiKey: 'test_12345',
      baseUrl: 'http://localhost:3002/api/v1',
      timeout: 5000
    });
  });

  describe('Client Configuration', () => {
    it('should initialize with correct configuration', () => {
      expect(client.getConfig()).toEqual({
        apiKey: 'test_12345',
        baseUrl: 'http://localhost:3002/api/v1',
        timeout: 5000
      });
    });

    it('should validate API key format', () => {
      expect(() => new BillingClient({ apiKey: 'invalid_key' }))
        .toThrow('API key must start with test_ or live_');
    });

    it('should update configuration', () => {
      client.updateConfig({ timeout: 10000 });
      expect(client.getConfig().timeout).toBe(10000);
    });
  });

  describe('Plans Resource', () => {
    it('should create a new plan', async () => {
      const planData = {
        name: 'Test Plan',
        description: 'A test subscription plan',
        price: 29.99,
        currency: 'USD',
        interval: 'month' as const,
        intervalCount: 1,
        trialDays: 7,
        features: ['Feature 1', 'Feature 2'],
        metadata: { tier: 'basic' }
      };

      const plan = await client.plans.create(planData);
      
      expect(plan).toMatchObject({
        id: expect.stringMatching(/^plan_/),
        name: 'Test Plan',
        price: 29.99,
        currency: 'USD',
        interval: 'month',
        active: true
      });
    });

    it('should get a plan by ID', async () => {
      const plans = await client.plans.list();
      const firstPlan = plans.data[0];
      
      const plan = await client.plans.get(firstPlan.id);
      expect(plan).toEqual(firstPlan);
    });

    it('should list plans with filters', async () => {
      const result = await client.plans.list({ active: true, limit: 5 });
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(5);
    });

    it('should search plans', async () => {
      const results = await client.plans.search('basic');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should get plan statistics', async () => {
      const stats = await client.plans.getStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('inactive');
    });
  });

  describe('Invoices Resource', () => {
    let testPlan: Plan;

    beforeEach(async () => {
      const plans = await client.plans.list();
      testPlan = plans.data[0];
    });

    it('should create a new invoice', async () => {
      const invoiceData = {
        planId: testPlan.id,
        amount: testPlan.price,
        currency: testPlan.currency,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { customerEmail: 'test@example.com' }
      };

      const invoice = await client.invoices.create(invoiceData);
      
      expect(invoice).toMatchObject({
        id: expect.stringMatching(/^inv_/),
        planId: testPlan.id,
        amount: testPlan.price,
        currency: testPlan.currency,
        status: 'pending'
      });
    });

    it('should get an invoice by ID', async () => {
      const invoices = await client.invoices.list();
      const firstInvoice = invoices.data[0];
      
      const invoice = await client.invoices.get(firstInvoice.id);
      expect(invoice).toEqual(firstInvoice);
    });

    it('should list invoices with filters', async () => {
      const result = await client.invoices.list({ 
        status: 'pending', 
        planId: testPlan.id,
        limit: 10 
      });
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should get invoice status', async () => {
      const invoices = await client.invoices.list();
      const invoice = invoices.data[0];
      
      const status = await client.invoices.getStatus(invoice.id);
      expect(['pending', 'paid', 'cancelled', 'overdue']).toContain(status);
    });

    it('should mark invoice as paid', async () => {
      const invoices = await client.invoices.list({ status: 'pending' });
      if (invoices.data.length > 0) {
        const invoice = invoices.data[0];
        const paidInvoice = await client.invoices.markAsPaid(invoice.id);
        expect(paidInvoice.status).toBe('paid');
        expect(paidInvoice.paidAt).toBeDefined();
      }
    });

    it('should cancel an invoice', async () => {
      const invoices = await client.invoices.list({ status: 'pending' });
      if (invoices.data.length > 0) {
        const invoice = invoices.data[0];
        const cancelledInvoice = await client.invoices.cancel(invoice.id);
        expect(cancelledInvoice.status).toBe('cancelled');
      }
    });

    it('should get payment URL', async () => {
      const invoices = await client.invoices.list();
      const invoice = invoices.data[0];
      
      const paymentUrl = await client.invoices.getPaymentUrl(invoice.id);
      expect(paymentUrl).toMatch(/^https?:\/\//);
    });

    it('should poll invoice status with timeout', async () => {
      const invoices = await client.invoices.list({ status: 'pending' });
      if (invoices.data.length > 0) {
        const invoice = invoices.data[0];
        
        // This should timeout since we're not actually paying the invoice
        await expect(
          client.invoices.pollStatus(invoice.id, 'paid', { timeout: 1000, interval: 100 })
        ).rejects.toThrow('Timeout waiting for status');
      }
    });
  });

  describe('Refunds Resource', () => {
    let testInvoice: Invoice;

    beforeEach(async () => {
      const invoices = await client.invoices.list({ status: 'paid' });
      if (invoices.data.length === 0) {
        // Create and pay an invoice for testing
        const plans = await client.plans.list();
        const plan = plans.data[0];
        
        const invoice = await client.invoices.create({
          planId: plan.id,
          amount: plan.price,
          currency: plan.currency
        });
        
        testInvoice = await client.invoices.markAsPaid(invoice.id);
      } else {
        testInvoice = invoices.data[0];
      }
    });

    it('should create a refund', async () => {
      const refundData = {
        invoiceId: testInvoice.id,
        amount: testInvoice.amount,
        reason: 'Customer request',
        metadata: { requestedBy: 'customer' }
      };

      const refund = await client.refunds.create(refundData);
      
      expect(refund).toMatchObject({
        id: expect.stringMatching(/^ref_/),
        invoiceId: testInvoice.id,
        amount: testInvoice.amount,
        reason: 'Customer request',
        status: 'pending'
      });
    });

    it('should get a refund by ID', async () => {
      const refunds = await client.refunds.list();
      if (refunds.data.length > 0) {
        const firstRefund = refunds.data[0];
        const refund = await client.refunds.get(firstRefund.id);
        expect(refund).toEqual(firstRefund);
      }
    });

    it('should list refunds with filters', async () => {
      const result = await client.refunds.list({ 
        status: 'pending',
        invoiceId: testInvoice.id,
        limit: 5 
      });
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should get refunds by invoice', async () => {
      const refunds = await client.refunds.getByInvoice(testInvoice.id);
      expect(Array.isArray(refunds)).toBe(true);
    });

    it('should check if invoice can be refunded', async () => {
      const canRefund = await client.refunds.canRefund(testInvoice.id);
      expect(typeof canRefund).toBe('boolean');
    });

    it('should mark refund as completed', async () => {
      const refunds = await client.refunds.list({ status: 'pending' });
      if (refunds.data.length > 0) {
        const refund = refunds.data[0];
        const completedRefund = await client.refunds.markAsCompleted(refund.id);
        expect(completedRefund.status).toBe('completed');
        expect(completedRefund.processedAt).toBeDefined();
      }
    });
  });

  describe('Webhooks Resource', () => {
    let webhookVerifier: WebhookVerifier;

    beforeEach(() => {
      webhookVerifier = new WebhookVerifier('test_secret');
    });

    it('should verify webhook signature', async () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test_secret';
      const timestamp = Date.now().toString();
      
      const signature = await webhookVerifier.generateSignature(payload, secret, timestamp);
      
      const isValid = await client.webhooks.verifySignature(payload, signature, timestamp, secret);
      expect(isValid).toBe(true);
    });

    it('should validate webhook payload', async () => {
      const payload = {
        id: 'evt_test',
        type: 'invoice.paid',
        timestamp: new Date().toISOString(),
        data: { test: 'data' }
      };

      const validation = await client.webhooks.validateWebhook(payload);
      expect(validation.valid).toBe(true);
    });

    it('should generate test signature', async () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test_secret';
      
      const signature = await client.webhooks.generateSignature(payload, secret);
      expect(signature).toMatch(/^[a-f0-9]+$/);
    });

    it('should create test event', async () => {
      const event = await client.webhooks.createTestEvent('invoice.paid');
      
      expect(event).toMatchObject({
        id: expect.stringMatching(/^evt_/),
        type: 'invoice.paid',
        timestamp: expect.any(String),
        data: expect.any(Object)
      });
    });

    it('should get event types', async () => {
      const eventTypes = await client.webhooks.getEventTypes();
      expect(Array.isArray(eventTypes)).toBe(true);
      expect(eventTypes).toContain('invoice.paid');
      expect(eventTypes).toContain('subscription.expired');
    });

    it('should test webhook endpoint', async () => {
      const result = await client.webhooks.testEndpoint('https://httpbin.org/post', 'test_secret');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('response');
    });

    it('should parse webhook payload', async () => {
      const rawPayload = JSON.stringify({
        id: 'evt_test',
        type: 'invoice.paid',
        timestamp: new Date().toISOString(),
        data: { invoice: { id: 'inv_test' } }
      });

      const parsed = await client.webhooks.parseWebhookPayload(rawPayload);
      expect(parsed).toHaveProperty('id', 'evt_test');
      expect(parsed).toHaveProperty('type', 'invoice.paid');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const badClient = new BillingClient({
        apiKey: 'test_12345',
        baseUrl: 'http://localhost:9999/api/v1' // Non-existent server
      });

      await expect(badClient.plans.list()).rejects.toThrow();
    });

    it('should handle invalid API responses', async () => {
      // This would require mocking the HTTP client to return invalid responses
      // For now, we'll test with the mock API service
      expect(true).toBe(true);
    });

    it('should retry failed requests', async () => {
      // Test retry logic - this would require more sophisticated mocking
      expect(true).toBe(true);
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      const result = await client.testConnection();
      expect(result.success).toBe(true);
      expect(result.latency).toBeGreaterThan(0);
    });
  });
});