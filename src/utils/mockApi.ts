import { Plan, Invoice, Refund, WebhookEvent, ApiResponse } from '../types/index';

// Mock data storage
const mockPlans: Map<string, Plan> = new Map();
const mockInvoices: Map<string, Invoice> = new Map();
const mockRefunds: Map<string, Refund> = new Map();

// Initialize with some sample data
const samplePlan: Plan = {
  id: 'pro',
  name: 'Pro Plan',
  price: 29.99,
  currency: 'USD',
  interval: 'monthly',
  description: 'Professional features with Discord access',
  features: ['Advanced features', 'Discord role access', 'Priority support'],
  metadata: { tier: 'pro', popular: true },
  active: true,
  intervalCount: 1,
  trialDays: 14,
  createdAt: new Date(),
  updatedAt: new Date()
};

mockPlans.set('pro', samplePlan);

export class MockApiService {
  private static instance: MockApiService;
  
  static getInstance(): MockApiService {
    if (!MockApiService.instance) {
      MockApiService.instance = new MockApiService();
    }
    return MockApiService.instance;
  }

  // Plan operations
  async createPlan(planData: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Plan>> {
    const plan: Plan = {
      ...planData,
      id: this.generateId('plan'),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    mockPlans.set(plan.id, plan);
    
    return {
      success: true,
      data: plan,
      message: 'Plan created successfully'
    };
  }

  async getPlan(planId: string): Promise<ApiResponse<Plan>> {
    const plan = mockPlans.get(planId);
    
    if (!plan) {
      return {
        success: false,
        error: 'Plan not found'
      };
    }
    
    return {
      success: true,
      data: plan
    };
  }

  async listPlans(): Promise<ApiResponse<Plan[]>> {
    return {
      success: true,
      data: Array.from(mockPlans.values())
    };
  }

  // Invoice operations
  async createInvoice(invoiceData: { planId: string; wallet: string; description?: string }): Promise<ApiResponse<Invoice>> {
    const plan = mockPlans.get(invoiceData.planId);
    
    if (!plan) {
      return {
        success: false,
        error: 'Plan not found'
      };
    }

    const invoice: Invoice = {
      id: this.generateId('inv'),
      planId: invoiceData.planId,
      wallet: invoiceData.wallet,
      amount: plan.price,
      currency: plan.currency,
      status: 'unpaid',
      description: invoiceData.description || `Payment for ${plan.name}`,
      merchantName: 'Billing System Demo',
      expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      createdAt: new Date(),
      updatedAt: new Date(),
      paymentUrl: `https://pay.billing.demo/invoice/${this.generateId('inv')}`
    };
    
    mockInvoices.set(invoice.id, invoice);
    
    return {
      success: true,
      data: invoice,
      message: 'Invoice created successfully'
    };
  }

  async getInvoice(invoiceId: string): Promise<ApiResponse<Invoice>> {
    const invoice = mockInvoices.get(invoiceId);
    
    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found'
      };
    }
    
    return {
      success: true,
      data: invoice
    };
  }

  async getInvoiceStatus(invoiceId: string): Promise<ApiResponse<{ status: string; lastUpdated: Date }>> {
    const invoice = mockInvoices.get(invoiceId);
    
    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found'
      };
    }
    
    return {
      success: true,
      data: {
        status: invoice.status,
        lastUpdated: typeof invoice.updatedAt === 'string' ? new Date(invoice.updatedAt) : invoice.updatedAt
      }
    };
  }

  async listInvoices(): Promise<ApiResponse<Invoice[]>> {
    return {
      success: true,
      data: Array.from(mockInvoices.values())
    };
  }

  async updateInvoiceStatus(invoiceId: string, status: Invoice['status']): Promise<ApiResponse<Invoice>> {
    const invoice = mockInvoices.get(invoiceId);
    
    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found'
      };
    }
    
    invoice.status = status;
    invoice.updatedAt = new Date();
    mockInvoices.set(invoiceId, invoice);
    
    return {
      success: true,
      data: invoice,
      message: 'Invoice status updated successfully'
    };
  }

  // Refund operations
  async createRefund(invoiceId: string, reason?: string): Promise<ApiResponse<Refund>> {
    const invoice = mockInvoices.get(invoiceId);
    
    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found'
      };
    }
    
    if (invoice.status !== 'paid') {
      return {
        success: false,
        error: 'Can only refund paid invoices'
      };
    }

    const refund: Refund = {
      id: this.generateId('ref'),
      invoiceId,
      amount: invoice.amount,
      currency: invoice.currency,
      reason,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    mockRefunds.set(refund.id, refund);
    
    // Update invoice status
    invoice.status = 'refunded';
    invoice.updatedAt = new Date();
    mockInvoices.set(invoiceId, invoice);
    
    return {
      success: true,
      data: refund,
      message: 'Refund processed successfully'
    };
  }

  // Webhook operations
  async sendWebhook(type: WebhookEvent['type'], data: any): Promise<ApiResponse<WebhookEvent>> {
    const webhook: WebhookEvent = {
      id: this.generateId('wh'),
      type,
      data,
      timestamp: new Date(),
      signature: this.generateSignature(data)
    };
    
    // Simulate webhook delivery
    console.log(`🔔 Mock webhook sent: ${type}`, webhook);
    
    return {
      success: true,
      data: webhook,
      message: 'Webhook sent successfully'
    };
  }

  // Utility methods
  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}_${timestamp}${random}`;
  }

  private generateSignature(data: any): string {
    // Simple mock signature - in real implementation, use HMAC
    return Buffer.from(JSON.stringify(data)).toString('base64').substr(0, 32);
  }

  // Test helpers
  async simulatePayment(invoiceId: string): Promise<ApiResponse<Invoice>> {
    const result = await this.updateInvoiceStatus(invoiceId, 'paid');
    
    if (result.success && result.data) {
      // Send webhook
      await this.sendWebhook('invoice.paid', {
        invoice: result.data,
        planId: result.data.planId
      });
    }
    
    return result;
  }

  async simulateExpiration(planId: string): Promise<ApiResponse<WebhookEvent>> {
    return await this.sendWebhook('subscription.expired', {
      planId,
      expiredAt: new Date()
    });
  }

  async getRefund(refundId: string): Promise<ApiResponse<Refund>> {
    const refund = mockRefunds.get(refundId);
    
    if (!refund) {
      return {
        success: false,
        error: 'Refund not found'
      };
    }
    
    return {
      success: true,
      data: refund
    };
  }

  async listRefunds(): Promise<ApiResponse<Refund[]>> {
    return {
      success: true,
      data: Array.from(mockRefunds.values())
    };
  }

  async markInvoiceAsPaid(invoiceId: string, transactionHash?: string): Promise<ApiResponse<Invoice>> {
    const invoice = mockInvoices.get(invoiceId);
    
    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found'
      };
    }
    
    invoice.status = 'paid';
    invoice.updatedAt = new Date();
    if (transactionHash) {
      invoice.metadata = { ...invoice.metadata, transactionHash };
    }
    mockInvoices.set(invoiceId, invoice);
    
    return {
      success: true,
      data: invoice
    };
  }

  // Get all data for debugging
  getAllData() {
    return {
      plans: Array.from(mockPlans.values()),
      invoices: Array.from(mockInvoices.values()),
      refunds: Array.from(mockRefunds.values())
    };
  }

  // Clear all data
  clearAllData() {
    mockPlans.clear();
    mockInvoices.clear();
    mockRefunds.clear();
    
    // Re-add sample data
    mockPlans.set('pro', samplePlan);
  }
}