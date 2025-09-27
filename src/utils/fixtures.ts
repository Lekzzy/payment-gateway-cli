import { Plan, Invoice, Refund, WebhookEvent } from '../types/index';

/**
 * Test fixtures for billing system components
 */

export const SAMPLE_PLANS: Plan[] = [
  {
    id: 'plan_basic_monthly',
    name: 'Basic Plan',
    description: 'Basic features for individuals',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    intervalCount: 1,
    trialDays: 7,
    features: [
      'Up to 5 projects',
      'Basic support',
      'Community access'
    ],
    metadata: {
      tier: 'basic',
      popular: false,
      discordRoleId: '1234567890123456789'
    },
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'plan_pro_monthly',
    name: 'Pro Plan',
    description: 'Advanced features for professionals',
    price: 29.99,
    currency: 'USD',
    interval: 'month',
    intervalCount: 1,
    trialDays: 14,
    features: [
      'Unlimited projects',
      'Priority support',
      'Advanced analytics',
      'API access',
      'Custom integrations'
    ],
    metadata: {
      tier: 'pro',
      popular: true,
      discordRoleId: '1234567890123456790'
    },
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'plan_enterprise_yearly',
    name: 'Enterprise Plan',
    description: 'Full-featured plan for teams',
    price: 299.99,
    currency: 'USD',
    interval: 'year',
    intervalCount: 1,
    trialDays: 30,
    features: [
      'Everything in Pro',
      'Dedicated support',
      'Custom contracts',
      'SLA guarantees',
      'On-premise deployment',
      'Advanced security'
    ],
    metadata: {
      tier: 'enterprise',
      popular: false,
      discordRoleId: '1234567890123456791'
    },
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'plan_student_monthly',
    name: 'Student Plan',
    description: 'Discounted plan for students',
    price: 4.99,
    currency: 'USD',
    interval: 'month',
    intervalCount: 1,
    trialDays: 30,
    features: [
      'Up to 3 projects',
      'Community support',
      'Educational resources'
    ],
    metadata: {
      tier: 'student',
      popular: false,
      discordRoleId: '1234567890123456792',
      requiresVerification: true
    },
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

export const SAMPLE_INVOICES: Invoice[] = [
  {
    id: 'inv_001',
    planId: 'plan_basic_monthly',
    amount: 9.99,
    currency: 'USD',
    status: 'paid',
    dueDate: '2024-02-01T00:00:00Z',
    paidAt: '2024-01-15T10:30:00Z',
    paymentUrl: 'https://pay.example.com/inv_001',
    metadata: {
      customerEmail: 'john@example.com',
      discordUserId: '987654321098765432',
      paymentMethod: 'card'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'inv_002',
    planId: 'plan_pro_monthly',
    amount: 29.99,
    currency: 'USD',
    status: 'pending',
    dueDate: '2024-02-01T00:00:00Z',
    paymentUrl: 'https://pay.example.com/inv_002',
    metadata: {
      customerEmail: 'jane@example.com',
      discordUserId: '987654321098765433',
      remindersSent: 1
    },
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: 'inv_003',
    planId: 'plan_enterprise_yearly',
    amount: 299.99,
    currency: 'USD',
    status: 'overdue',
    dueDate: '2024-01-01T00:00:00Z',
    paymentUrl: 'https://pay.example.com/inv_003',
    metadata: {
      customerEmail: 'admin@company.com',
      discordUserId: '987654321098765434',
      remindersSent: 3,
      escalated: true
    },
    createdAt: '2023-12-01T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z'
  },
  {
    id: 'inv_004',
    planId: 'plan_student_monthly',
    amount: 4.99,
    currency: 'USD',
    status: 'cancelled',
    dueDate: '2024-02-01T00:00:00Z',
    paymentUrl: 'https://pay.example.com/inv_004',
    metadata: {
      customerEmail: 'student@university.edu',
      discordUserId: '987654321098765435',
      cancellationReason: 'customer_request'
    },
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z'
  }
];

export const SAMPLE_REFUNDS: Refund[] = [
  {
    id: 'ref_001',
    invoiceId: 'inv_001',
    amount: 9.99,
    currency: 'USD',
    reason: 'customer_request',
    status: 'completed',
    processedAt: '2024-01-20T14:30:00Z',
    metadata: {
      requestedBy: 'john@example.com',
      approvedBy: 'support@example.com',
      refundMethod: 'original_payment_method'
    },
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  },
  {
    id: 'ref_002',
    invoiceId: 'inv_002',
    amount: 14.99,
    currency: 'USD',
    reason: 'billing_error',
    status: 'pending',
    metadata: {
      requestedBy: 'jane@example.com',
      partialRefund: true,
      originalAmount: 29.99
    },
    createdAt: '2024-01-22T09:15:00Z',
    updatedAt: '2024-01-22T09:15:00Z'
  },
  {
    id: 'ref_003',
    invoiceId: 'inv_003',
    amount: 299.99,
    currency: 'USD',
    reason: 'service_not_delivered',
    status: 'failed',
    metadata: {
      requestedBy: 'admin@company.com',
      failureReason: 'payment_method_expired',
      retryCount: 2
    },
    createdAt: '2024-01-18T16:45:00Z',
    updatedAt: '2024-01-19T10:20:00Z'
  }
];

export const SAMPLE_WEBHOOK_EVENTS: WebhookEvent[] = [
  {
    id: 'evt_001',
    type: 'invoice.paid',
    data: {
      invoice: SAMPLE_INVOICES[0],
      plan: SAMPLE_PLANS[0],
      customer: {
        email: 'john@example.com',
        discordUserId: '987654321098765432'
      }
    },
    timestamp: new Date('2024-01-15T10:30:00Z'),
    signature: 'test_signature_001'
  },
  {
    id: 'evt_002',
    type: 'subscription.expired',
    data: {
      subscription: {
        id: 'sub_001',
        planId: 'plan_basic_monthly',
        status: 'expired',
        currentPeriodEnd: '2024-01-31T23:59:59Z',
        metadata: {
          discordUserId: '987654321098765432'
        }
      },
      plan: SAMPLE_PLANS[0]
    },
    timestamp: new Date('2024-02-01T00:00:00Z'),
    signature: 'test_signature_002'
  },
  {
    id: 'evt_003',
    type: 'refund.completed',
    data: {
      refund: SAMPLE_REFUNDS[0],
      invoice: SAMPLE_INVOICES[0],
      plan: SAMPLE_PLANS[0]
    },
    timestamp: new Date('2024-01-20T14:30:00Z'),
    signature: 'test_signature_003'
  },
  {
    id: 'evt_004',
    type: 'subscription.cancelled',
    data: {
      subscription: {
        id: 'sub_002',
        planId: 'plan_pro_monthly',
        status: 'cancelled',
        cancelledAt: '2024-01-25T12:00:00Z',
        metadata: {
          discordUserId: '987654321098765433',
          cancellationReason: 'customer_request'
        }
      },
      plan: SAMPLE_PLANS[1]
    },
    timestamp: new Date('2024-01-25T12:00:00Z'),
    signature: 'test_signature_004'
  }
];

/**
 * Utility functions for working with fixtures
 */

export class FixtureManager {
  /**
   * Get a random plan
   */
  static getRandomPlan(): Plan {
    return SAMPLE_PLANS[Math.floor(Math.random() * SAMPLE_PLANS.length)];
  }

  /**
   * Get a random invoice
   */
  static getRandomInvoice(): Invoice {
    return SAMPLE_INVOICES[Math.floor(Math.random() * SAMPLE_INVOICES.length)];
  }

  /**
   * Get a random refund
   */
  static getRandomRefund(): Refund {
    return SAMPLE_REFUNDS[Math.floor(Math.random() * SAMPLE_REFUNDS.length)];
  }

  /**
   * Get a random webhook event
   */
  static getRandomWebhookEvent(): WebhookEvent {
    return SAMPLE_WEBHOOK_EVENTS[Math.floor(Math.random() * SAMPLE_WEBHOOK_EVENTS.length)];
  }

  /**
   * Create a new invoice with random data
   */
  static createRandomInvoice(overrides: Partial<Invoice> = {}): Invoice {
    const plan = this.getRandomPlan();
    const baseInvoice: Invoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      planId: plan.id,
      amount: plan.price,
      currency: plan.currency,
      status: ['pending', 'paid', 'overdue', 'cancelled'][Math.floor(Math.random() * 4)] as any,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paymentUrl: `https://pay.example.com/inv_${Date.now()}`,
      metadata: {
        customerEmail: `user${Math.floor(Math.random() * 1000)}@example.com`,
        discordUserId: `${Math.floor(Math.random() * 1000000000000000000)}`
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return { ...baseInvoice, ...overrides };
  }

  /**
   * Create a new refund with random data
   */
  static createRandomRefund(invoiceId?: string, overrides: Partial<Refund> = {}): Refund {
    const invoice = invoiceId ? 
      SAMPLE_INVOICES.find(inv => inv.id === invoiceId) || this.getRandomInvoice() :
      this.getRandomInvoice();

    const baseRefund: Refund = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      invoiceId: invoice.id,
      amount: invoice.amount * (0.5 + Math.random() * 0.5), // 50-100% of invoice amount
      currency: invoice.currency,
      reason: ['customer_request', 'billing_error', 'service_not_delivered', 'duplicate_payment'][Math.floor(Math.random() * 4)] as any,
      status: ['pending', 'completed', 'failed'][Math.floor(Math.random() * 3)] as any,
      metadata: {
        requestedBy: invoice.metadata?.customerEmail || 'unknown@example.com'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return { ...baseRefund, ...overrides };
  }

  /**
   * Create a new webhook event with random data
   */
  static createRandomWebhookEvent(type?: WebhookEvent['type'], overrides: Partial<WebhookEvent> = {}): WebhookEvent {
    const eventType: WebhookEvent['type'] = type || ['invoice.paid', 'subscription.expired', 'refund.completed', 'subscription.cancelled'][Math.floor(Math.random() * 4)] as WebhookEvent['type'];
    const invoice = this.getRandomInvoice();
    const plan = SAMPLE_PLANS.find(p => p.id === invoice.planId) || this.getRandomPlan();

    let eventData: any = {};

    switch (eventType) {
      case 'invoice.paid':
        eventData = {
          invoice: { ...invoice, status: 'paid', paidAt: new Date().toISOString() },
          plan,
          customer: {
            email: invoice.metadata?.customerEmail,
            discordUserId: invoice.metadata?.discordUserId
          }
        };
        break;
      case 'subscription.expired':
        eventData = {
          subscription: {
            id: `sub_${Date.now()}`,
            planId: plan.id,
            status: 'expired',
            currentPeriodEnd: new Date().toISOString(),
            metadata: {
              discordUserId: invoice.metadata?.discordUserId
            }
          },
          plan
        };
        break;
      case 'refund.completed':
        const refund = this.createRandomRefund(invoice.id, { status: 'completed' });
        eventData = { refund, invoice, plan };
        break;
      case 'subscription.cancelled':
        eventData = {
          subscription: {
            id: `sub_${Date.now()}`,
            planId: plan.id,
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            metadata: {
              discordUserId: invoice.metadata?.discordUserId,
              cancellationReason: 'customer_request'
            }
          },
          plan
        };
        break;
    }

    const baseEvent: WebhookEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      data: eventData,
      timestamp: new Date(),
      signature: 'test_signature'
    };

    return { ...baseEvent, ...overrides };
  }

  /**
   * Get plans by tier
   */
  static getPlansByTier(tier: string): Plan[] {
    return SAMPLE_PLANS.filter(plan => plan.metadata?.tier === tier);
  }

  /**
   * Get invoices by status
   */
  static getInvoicesByStatus(status: string): Invoice[] {
    return SAMPLE_INVOICES.filter(invoice => invoice.status === status);
  }

  /**
   * Get refunds by status
   */
  static getRefundsByStatus(status: string): Refund[] {
    return SAMPLE_REFUNDS.filter(refund => refund.status === status);
  }

  /**
   * Get webhook events by type
   */
  static getWebhookEventsByType(type: string): WebhookEvent[] {
    return SAMPLE_WEBHOOK_EVENTS.filter(event => event.type === type);
  }

  /**
   * Generate bulk test data
   */
  static generateBulkData(counts: { plans?: number; invoices?: number; refunds?: number; events?: number }) {
    const data: {
      plans: Plan[];
      invoices: Invoice[];
      refunds: Refund[];
      events: WebhookEvent[];
    } = {
      plans: [...SAMPLE_PLANS],
      invoices: [...SAMPLE_INVOICES],
      refunds: [...SAMPLE_REFUNDS],
      events: [...SAMPLE_WEBHOOK_EVENTS]
    };

    // Generate additional invoices
    if (counts.invoices) {
      for (let i = 0; i < counts.invoices; i++) {
        data.invoices.push(this.createRandomInvoice());
      }
    }

    // Generate additional refunds
    if (counts.refunds) {
      for (let i = 0; i < counts.refunds; i++) {
        const randomInvoice = data.invoices[Math.floor(Math.random() * data.invoices.length)];
        data.refunds.push(this.createRandomRefund(randomInvoice.id));
      }
    }

    // Generate additional webhook events
    if (counts.events) {
      for (let i = 0; i < counts.events; i++) {
        data.events.push(this.createRandomWebhookEvent());
      }
    }

    return data;
  }
}