# Examples and Use Cases

This document provides practical examples and common use cases for the Billing System CLI and SDK.

## 📋 Table of Contents

- [CLI Examples](#cli-examples)
- [SDK Examples](#sdk-examples)
- [Discord Integration Examples](#discord-integration-examples)
- [Webhook Examples](#webhook-examples)
- [API Integration Examples](#api-integration-examples)
- [Real-world Use Cases](#real-world-use-cases)
- [Testing Examples](#testing-examples)

## 💻 CLI Examples

### Initial Setup and Configuration

```bash
# Initialize billing CLI
billing init

# Configure API credentials
? Enter your API key: test_12345
? Enter API base URL: https://api.billing.example.com
? Enable debug mode? Yes

✅ Configuration saved to ~/.billing/config.json
```

### Plan Management

```bash
# List all plans
billing plan list

# List only active subscription plans
billing plan list --status active --type subscription

# Get specific plan details
billing plan get plan_pro_456

# Create a new plan
billing plan create \
  --name "Enterprise Plan" \
  --description "Full enterprise features" \
  --amount 9999 \
  --currency USD \
  --interval month \
  --type subscription \
  --features "advanced_analytics,priority_support,custom_integrations"

# Update existing plan
billing plan update plan_enterprise_789 \
  --name "Enterprise Plus Plan" \
  --description "Enhanced enterprise features"

# Deactivate a plan
billing plan delete plan_old_123
```

### Invoice Management

```bash
# List recent invoices
billing invoice list --limit 10

# List paid invoices for specific customer
billing invoice list --status paid --customer-email john@example.com

# Get invoice details
billing invoice get inv_123456789

# Create invoice for existing plan
billing invoice create \
  --plan-id plan_pro_456 \
  --customer-email jane@example.com \
  --customer-name "Jane Smith" \
  --due-date "2024-02-15"

# Update invoice status
billing invoice update-status inv_123456789 --status paid

# Generate QR code for payment
billing invoice qr inv_123456789 --size 300 --format png > payment_qr.png

# Simulate payment (test mode only)
billing invoice simulate-payment inv_123456789 --success true
```

### Refund Processing

```bash
# List all refunds
billing refund list

# List refunds for specific invoice
billing refund list --invoice-id inv_123456789

# Create refund
billing refund create \
  --invoice-id inv_123456789 \
  --amount 2999 \
  --reason customer_request

# Update refund status
billing refund update-status ref_987654321 --status completed
```

### Webhook Management

```bash
# List webhook events
billing webhook events --limit 20

# List specific event types
billing webhook events --type invoice.paid

# Verify webhook signature
billing webhook verify \
  --payload '{"type":"invoice.paid","data":{...}}' \
  --signature "sha256=abc123..." \
  --timestamp "1705312200" \
  --secret "whsec_abc123..."

# Start webhook listener for testing
billing webhook listen --port 3000 --path /webhooks
```

### Discord Integration

```bash
# Configure Discord bot
billing discord config

# Map billing plans to Discord roles
billing discord map

# View current mappings
billing discord mappings

# Test Discord connection
billing discord test

# Start Discord webhook listener
billing discord listen --port 3001

# Remove plan-role mapping
billing discord unmap
```

## 📦 SDK Examples

### Basic Setup

```typescript
import { BillingClient } from '@your-org/billing-sdk';

// Initialize client
const client = new BillingClient({
  apiKey: process.env.BILLING_API_KEY!,
  baseUrl: 'https://api.billing.example.com',
  timeout: 30000,
  debug: process.env.NODE_ENV === 'development'
});

// Test connection
try {
  const plans = await client.plans.list({ limit: 1 });
  console.log('✅ Connected to billing API');
} catch (error) {
  console.error('❌ Failed to connect:', error.message);
}
```

### Plan Management

```typescript
// Create subscription plans
const basicPlan = await client.plans.create({
  name: 'Basic Plan',
  description: 'Essential features for small teams',
  amount: 999, // $9.99
  currency: 'USD',
  interval: 'month',
  type: 'subscription',
  features: ['basic_analytics', 'email_support'],
  metadata: {
    category: 'starter',
    max_users: 5
  }
});

const proPlan = await client.plans.create({
  name: 'Pro Plan',
  description: 'Advanced features for growing businesses',
  amount: 2999, // $29.99
  currency: 'USD',
  interval: 'month',
  type: 'subscription',
  features: ['advanced_analytics', 'priority_support', 'api_access'],
  metadata: {
    category: 'professional',
    max_users: 25
  }
});

// List plans with filtering
const activePlans = await client.plans.list({
  status: 'active',
  type: 'subscription',
  limit: 50
});

console.log(`Found ${activePlans.data.length} active subscription plans`);

// Update plan pricing
await client.plans.update(proPlan.id, {
  amount: 3499, // Increase to $34.99
  metadata: {
    ...proPlan.metadata,
    price_updated: new Date().toISOString()
  }
});
```

### Invoice Processing

```typescript
// Create invoice for customer
async function createCustomerInvoice(
  planId: string,
  customerEmail: string,
  customerName: string
) {
  try {
    const invoice = await client.invoices.create({
      plan_id: planId,
      customer: {
        email: customerEmail,
        name: customerName
      },
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      metadata: {
        source: 'website_signup',
        campaign: 'spring_promotion'
      }
    });

    console.log(`📧 Invoice created: ${invoice.id}`);
    console.log(`💳 Payment URL: ${invoice.payment_url}`);
    
    return invoice;
  } catch (error) {
    console.error('Failed to create invoice:', error.message);
    throw error;
  }
}

// Process payment simulation (development)
async function simulatePayment(invoiceId: string) {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Payment simulation only available in development');
  }

  await client.invoices.simulatePayment(invoiceId, {
    success: true,
    delay: 2000 // 2 second delay
  });

  console.log(`✅ Payment simulated for invoice: ${invoiceId}`);
}

// Generate payment QR code
async function generatePaymentQR(invoiceId: string) {
  const qrData = await client.invoices.generateQR(invoiceId, {
    size: 300,
    format: 'json'
  });

  // Save QR code to file or display in UI
  console.log(`📱 QR Code generated: ${qrData.qr_code.substring(0, 50)}...`);
  
  return qrData.qr_code;
}
```

### Subscription Management

```typescript
// Complete subscription flow
async function handleSubscriptionSignup(
  email: string,
  name: string,
  planId: string,
  discordUserId?: string
) {
  try {
    // 1. Create invoice
    const invoice = await client.invoices.create({
      plan_id: planId,
      customer: {
        email,
        name,
        discord_user_id: discordUserId
      },
      metadata: {
        signup_date: new Date().toISOString(),
        source: 'web_app'
      }
    });

    // 2. Generate payment QR code
    const qrCode = await client.invoices.generateQR(invoice.id, {
      size: 256,
      format: 'json'
    });

    // 3. Return signup data
    return {
      invoice,
      paymentUrl: invoice.payment_url,
      qrCode: qrCode.qr_code,
      expiresAt: invoice.due_date
    };

  } catch (error) {
    console.error('Subscription signup failed:', error.message);
    throw error;
  }
}

// Handle subscription cancellation
async function cancelSubscription(subscriptionId: string, reason: string) {
  // In a real implementation, you'd have subscription endpoints
  // For now, we'll create a refund for the last payment
  
  const invoices = await client.invoices.list({
    subscription_id: subscriptionId,
    status: 'paid',
    limit: 1
  });

  if (invoices.data.length === 0) {
    throw new Error('No paid invoices found for subscription');
  }

  const lastInvoice = invoices.data[0];
  
  const refund = await client.refunds.create({
    invoice_id: lastInvoice.id,
    amount: lastInvoice.amount,
    reason: 'subscription_cancelled',
    metadata: {
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString()
    }
  });

  console.log(`🔄 Refund created: ${refund.id}`);
  return refund;
}
```

### Error Handling

```typescript
import { BillingError } from '@your-org/billing-sdk';

async function robustApiCall() {
  try {
    const plan = await client.plans.get('plan_123');
    return plan;
  } catch (error) {
    if (error instanceof BillingError) {
      switch (error.code) {
        case 'NOT_FOUND':
          console.log('Plan not found, creating new one...');
          return await createDefaultPlan();
        
        case 'RATE_LIMITED':
          console.log('Rate limited, waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          return await client.plans.get('plan_123');
        
        case 'INVALID_API_KEY':
          console.error('Invalid API key, check configuration');
          throw new Error('Authentication failed');
        
        default:
          console.error(`API Error [${error.code}]: ${error.message}`);
          throw error;
      }
    } else {
      console.error('Unexpected error:', error);
      throw error;
    }
  }
}

// Retry wrapper
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const plan = await withRetry(() => client.plans.get('plan_123'));
```

## 🎮 Discord Integration Examples

### Basic Discord Setup

```typescript
import { DiscordConfigManager, DiscordRoleManager } from './src/discord';

// Initialize Discord services
const configManager = new DiscordConfigManager();
const roleManager = new DiscordRoleManager(configManager);

// Connect to Discord
await roleManager.connect();
console.log('✅ Connected to Discord');
```

### Automated Role Management

```typescript
// Handle billing events for Discord role management
async function handleBillingEvent(event: any) {
  const { type, data } = event;
  
  switch (type) {
    case 'invoice.paid':
      await handleInvoicePaid(data.invoice);
      break;
    
    case 'subscription.expired':
    case 'subscription.cancelled':
      await handleSubscriptionEnded(data.subscription);
      break;
    
    case 'refund.completed':
      await handleRefundCompleted(data.refund);
      break;
    
    default:
      console.log(`Unhandled event type: ${type}`);
  }
}

async function handleInvoicePaid(invoice: any) {
  const { customer, plan_id } = invoice;
  
  if (!customer.discord_user_id) {
    console.log('No Discord user ID provided, skipping role assignment');
    return;
  }

  try {
    await roleManager.grantRole(customer.discord_user_id, plan_id);
    console.log(`✅ Granted role for plan ${plan_id} to user ${customer.discord_user_id}`);
  } catch (error) {
    console.error(`Failed to grant role: ${error.message}`);
  }
}

async function handleSubscriptionEnded(subscription: any) {
  const { customer, plan_id } = subscription;
  
  if (!customer.discord_user_id) return;

  try {
    await roleManager.revokeRole(customer.discord_user_id, plan_id);
    console.log(`✅ Revoked role for plan ${plan_id} from user ${customer.discord_user_id}`);
  } catch (error) {
    console.error(`Failed to revoke role: ${error.message}`);
  }
}
```

### Custom Discord Bot Commands

```typescript
import { Client, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';

// Extend Discord bot with billing commands
class BillingDiscordBot {
  private client: Client;
  private billingClient: BillingClient;

  constructor(token: string, billingApiKey: string) {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
    });
    
    this.billingClient = new BillingClient({ apiKey: billingApiKey });
    this.setupCommands();
  }

  private setupCommands() {
    // /billing-status command
    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      if (interaction.commandName === 'billing-status') {
        await this.handleBillingStatus(interaction);
      }
    });
  }

  private async handleBillingStatus(interaction: any) {
    const userId = interaction.user.id;
    
    try {
      // Find user's invoices
      const invoices = await this.billingClient.invoices.list({
        customer_discord_id: userId,
        limit: 5
      });

      if (invoices.data.length === 0) {
        await interaction.reply('No billing information found.');
        return;
      }

      const latestInvoice = invoices.data[0];
      const status = latestInvoice.status === 'paid' ? '✅ Active' : '⏳ Pending';
      
      await interaction.reply({
        embeds: [{
          title: '💳 Billing Status',
          fields: [
            { name: 'Status', value: status, inline: true },
            { name: 'Plan', value: latestInvoice.plan_name, inline: true },
            { name: 'Amount', value: `$${latestInvoice.amount / 100}`, inline: true }
          ],
          color: latestInvoice.status === 'paid' ? 0x00ff00 : 0xffaa00
        }]
      });
    } catch (error) {
      await interaction.reply('Failed to fetch billing information.');
    }
  }

  async start() {
    await this.client.login(process.env.DISCORD_BOT_TOKEN);
    console.log('🤖 Billing Discord bot started');
  }
}
```

## 🔗 Webhook Examples

### Express.js Webhook Handler

```typescript
import express from 'express';
import { WebhookVerifier } from './src/utils/webhook';

const app = express();
const webhookVerifier = new WebhookVerifier();

// Raw body parser for webhook verification
app.use('/webhooks', express.raw({ type: 'application/json' }));

app.post('/webhooks/billing', async (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const timestamp = req.headers['x-webhook-timestamp'] as string;
  const payload = req.body.toString();

  // Verify webhook signature
  const isValid = await webhookVerifier.verifyWebhook(
    payload,
    signature,
    timestamp,
    process.env.WEBHOOK_SECRET!
  );

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const event = JSON.parse(payload);
    await processWebhookEvent(event);
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

async function processWebhookEvent(event: any) {
  console.log(`📨 Processing webhook: ${event.type}`);
  
  switch (event.type) {
    case 'invoice.paid':
      await handlePaymentSuccess(event.data.invoice);
      break;
    
    case 'invoice.failed':
      await handlePaymentFailure(event.data.invoice);
      break;
    
    case 'subscription.created':
      await handleSubscriptionCreated(event.data.subscription);
      break;
    
    default:
      console.log(`Unhandled event: ${event.type}`);
  }
}

async function handlePaymentSuccess(invoice: any) {
  // Send confirmation email
  await sendEmail(invoice.customer.email, 'payment-confirmation', {
    invoice_id: invoice.id,
    amount: invoice.amount,
    plan_name: invoice.plan_name
  });

  // Grant Discord role if applicable
  if (invoice.customer.discord_user_id) {
    await roleManager.grantRole(
      invoice.customer.discord_user_id,
      invoice.plan_id
    );
  }

  // Update internal database
  await updateUserSubscription(invoice.customer.email, {
    plan_id: invoice.plan_id,
    status: 'active',
    paid_at: invoice.paid_at
  });
}
```

### Next.js API Route

```typescript
// pages/api/webhooks/billing.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { WebhookVerifier } from '../../../lib/webhook';

const webhookVerifier = new WebhookVerifier();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['x-webhook-signature'] as string;
  const timestamp = req.headers['x-webhook-timestamp'] as string;
  const payload = JSON.stringify(req.body);

  const isValid = await webhookVerifier.verifyWebhook(
    payload,
    signature,
    timestamp,
    process.env.WEBHOOK_SECRET!
  );

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  try {
    switch (event.type) {
      case 'invoice.paid':
        await handleInvoicePaid(event.data.invoice);
        break;
      
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.data.subscription);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
}

// Disable body parsing for raw webhook verification
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
```

## 🌐 API Integration Examples

### React Frontend Integration

```typescript
// hooks/useBilling.ts
import { useState, useEffect } from 'react';
import { BillingClient } from '@your-org/billing-sdk';

const billingClient = new BillingClient({
  apiKey: process.env.REACT_APP_BILLING_API_KEY!,
  baseUrl: process.env.REACT_APP_BILLING_API_URL!
});

export function usePlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await billingClient.plans.list({
          status: 'active',
          type: 'subscription'
        });
        setPlans(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  return { plans, loading, error };
}

export function useCreateInvoice() {
  const [loading, setLoading] = useState(false);

  const createInvoice = async (planId: string, customer: any) => {
    setLoading(true);
    try {
      const invoice = await billingClient.invoices.create({
        plan_id: planId,
        customer
      });
      return invoice;
    } finally {
      setLoading(false);
    }
  };

  return { createInvoice, loading };
}
```

```tsx
// components/PricingTable.tsx
import React from 'react';
import { usePlans, useCreateInvoice } from '../hooks/useBilling';

export function PricingTable() {
  const { plans, loading, error } = usePlans();
  const { createInvoice, loading: creating } = useCreateInvoice();

  const handleSubscribe = async (planId: string) => {
    try {
      const invoice = await createInvoice(planId, {
        email: 'user@example.com',
        name: 'John Doe'
      });
      
      // Redirect to payment page
      window.location.href = invoice.payment_url;
    } catch (error) {
      alert('Failed to create invoice');
    }
  };

  if (loading) return <div>Loading plans...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="pricing-table">
      {plans.map(plan => (
        <div key={plan.id} className="pricing-card">
          <h3>{plan.name}</h3>
          <p>{plan.description}</p>
          <div className="price">
            ${plan.amount / 100}/{plan.interval}
          </div>
          <ul>
            {plan.features.map(feature => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <button
            onClick={() => handleSubscribe(plan.id)}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Subscribe'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Node.js Backend Service

```typescript
// services/BillingService.ts
import { BillingClient } from '@your-org/billing-sdk';
import { EventEmitter } from 'events';

export class BillingService extends EventEmitter {
  private client: BillingClient;

  constructor(apiKey: string) {
    super();
    this.client = new BillingClient({ apiKey });
  }

  async createSubscription(userId: string, planId: string, userEmail: string) {
    try {
      // Create invoice
      const invoice = await this.client.invoices.create({
        plan_id: planId,
        customer: {
          email: userEmail,
          name: await this.getUserName(userId)
        },
        metadata: {
          user_id: userId,
          created_via: 'api'
        }
      });

      // Emit event for other services
      this.emit('subscription.created', {
        userId,
        planId,
        invoiceId: invoice.id
      });

      return invoice;
    } catch (error) {
      this.emit('subscription.error', { userId, planId, error });
      throw error;
    }
  }

  async handleWebhookEvent(event: any) {
    switch (event.type) {
      case 'invoice.paid':
        await this.activateSubscription(event.data.invoice);
        break;
      
      case 'subscription.cancelled':
        await this.deactivateSubscription(event.data.subscription);
        break;
    }
  }

  private async activateSubscription(invoice: any) {
    const userId = invoice.metadata.user_id;
    
    // Update user in database
    await this.updateUserSubscription(userId, {
      plan_id: invoice.plan_id,
      status: 'active',
      activated_at: new Date()
    });

    // Emit activation event
    this.emit('subscription.activated', {
      userId,
      planId: invoice.plan_id,
      invoiceId: invoice.id
    });
  }

  private async getUserName(userId: string): Promise<string> {
    // Fetch from your user database
    const user = await this.userRepository.findById(userId);
    return user.name;
  }

  private async updateUserSubscription(userId: string, data: any) {
    // Update your database
    await this.userRepository.updateSubscription(userId, data);
  }
}
```

## 🏢 Real-world Use Cases

### SaaS Application with Tiered Pricing

```typescript
// Complete SaaS billing integration
class SaaSBillingManager {
  private billingClient: BillingClient;
  private discordManager: DiscordRoleManager;

  constructor() {
    this.billingClient = new BillingClient({
      apiKey: process.env.BILLING_API_KEY!
    });
    this.discordManager = new DiscordRoleManager();
  }

  async setupPricingTiers() {
    // Create pricing tiers
    const tiers = [
      {
        name: 'Starter',
        amount: 999, // $9.99
        features: ['5_projects', 'basic_support'],
        discord_role: 'starter'
      },
      {
        name: 'Professional',
        amount: 2999, // $29.99
        features: ['unlimited_projects', 'priority_support', 'api_access'],
        discord_role: 'pro'
      },
      {
        name: 'Enterprise',
        amount: 9999, // $99.99
        features: ['everything', 'dedicated_support', 'custom_integrations'],
        discord_role: 'enterprise'
      }
    ];

    for (const tier of tiers) {
      const plan = await this.billingClient.plans.create({
        name: tier.name,
        amount: tier.amount,
        currency: 'USD',
        interval: 'month',
        type: 'subscription',
        features: tier.features,
        metadata: {
          discord_role: tier.discord_role,
          tier_level: tier.name.toLowerCase()
        }
      });

      console.log(`✅ Created plan: ${plan.name} (${plan.id})`);
    }
  }

  async handleUserUpgrade(userId: string, newPlanId: string) {
    const user = await this.getUserById(userId);
    
    // Create invoice for new plan
    const invoice = await this.billingClient.invoices.create({
      plan_id: newPlanId,
      customer: {
        email: user.email,
        name: user.name,
        discord_user_id: user.discord_id
      },
      metadata: {
        user_id: userId,
        upgrade_from: user.current_plan_id,
        upgrade_date: new Date().toISOString()
      }
    });

    // Calculate prorated refund if applicable
    if (user.current_plan_id) {
      await this.handleProration(user, newPlanId);
    }

    return invoice;
  }

  async handleProration(user: any, newPlanId: string) {
    // Calculate remaining days in current billing cycle
    const daysRemaining = this.calculateRemainingDays(user.billing_cycle_end);
    
    if (daysRemaining > 0) {
      const currentPlan = await this.billingClient.plans.get(user.current_plan_id);
      const dailyRate = currentPlan.amount / 30;
      const refundAmount = Math.floor(dailyRate * daysRemaining);

      if (refundAmount > 0) {
        await this.billingClient.refunds.create({
          invoice_id: user.last_invoice_id,
          amount: refundAmount,
          reason: 'prorated_upgrade',
          metadata: {
            days_remaining: daysRemaining,
            upgrade_to: newPlanId
          }
        });
      }
    }
  }

  private calculateRemainingDays(cycleEnd: Date): number {
    const now = new Date();
    const diffTime = cycleEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }
}
```

### Discord Community with Premium Features

```typescript
// Discord community with premium subscriptions
class DiscordCommunityBilling {
  private billingClient: BillingClient;
  private discordBot: Client;

  async setupCommunityTiers() {
    // Community supporter tiers
    const tiers = [
      {
        name: 'Supporter',
        amount: 499, // $4.99
        discord_role: 'supporter',
        perks: ['supporter_badge', 'early_access']
      },
      {
        name: 'VIP',
        amount: 999, // $9.99
        discord_role: 'vip',
        perks: ['vip_channels', 'custom_emoji', 'priority_support']
      },
      {
        name: 'Patron',
        amount: 1999, // $19.99
        discord_role: 'patron',
        perks: ['patron_channels', 'monthly_call', 'feature_requests']
      }
    ];

    for (const tier of tiers) {
      await this.billingClient.plans.create({
        name: tier.name,
        amount: tier.amount,
        currency: 'USD',
        interval: 'month',
        type: 'subscription',
        features: tier.perks,
        metadata: {
          discord_role: tier.discord_role,
          community_tier: true
        }
      });
    }
  }

  async handleMemberSubscription(discordUserId: string, planId: string) {
    // Get Discord user info
    const discordUser = await this.discordBot.users.fetch(discordUserId);
    
    // Create subscription invoice
    const invoice = await this.billingClient.invoices.create({
      plan_id: planId,
      customer: {
        email: `${discordUser.username}@discord.local`,
        name: discordUser.displayName || discordUser.username,
        discord_user_id: discordUserId
      },
      metadata: {
        discord_username: discordUser.username,
        discord_discriminator: discordUser.discriminator,
        subscription_type: 'community_support'
      }
    });

    // Send payment link via DM
    await discordUser.send({
      embeds: [{
        title: '💳 Complete Your Subscription',
        description: `Thank you for supporting our community!`,
        fields: [
          { name: 'Plan', value: invoice.plan_name, inline: true },
          { name: 'Amount', value: `$${invoice.amount / 100}`, inline: true }
        ],
        color: 0x00ff00
      }],
      components: [{
        type: 1,
        components: [{
          type: 2,
          style: 5,
          label: 'Pay Now',
          url: invoice.payment_url
        }]
      }]
    });

    return invoice;
  }
}
```

## 🧪 Testing Examples

### Unit Tests

```typescript
// tests/billing.test.ts
import { BillingClient } from '../src/sdk';
import { MockApiService } from '../src/utils/mock-api';

describe('BillingClient', () => {
  let client: BillingClient;
  let mockApi: MockApiService;

  beforeEach(() => {
    mockApi = new MockApiService();
    client = new BillingClient({
      apiKey: 'test_12345',
      baseUrl: 'http://localhost:3002'
    });
  });

  describe('Plans', () => {
    test('should create plan successfully', async () => {
      const planData = {
        name: 'Test Plan',
        amount: 1999,
        currency: 'USD',
        interval: 'month',
        type: 'subscription' as const
      };

      const plan = await client.plans.create(planData);

      expect(plan.id).toMatch(/^plan_/);
      expect(plan.name).toBe(planData.name);
      expect(plan.amount).toBe(planData.amount);
    });

    test('should list plans with filters', async () => {
      const plans = await client.plans.list({
        status: 'active',
        type: 'subscription',
        limit: 10
      });

      expect(Array.isArray(plans.data)).toBe(true);
      expect(plans.pagination).toBeDefined();
      expect(plans.pagination.limit).toBe(10);
    });
  });

  describe('Invoices', () => {
    test('should create invoice for plan', async () => {
      // First create a plan
      const plan = await client.plans.create({
        name: 'Test Plan',
        amount: 1999,
        currency: 'USD',
        interval: 'month',
        type: 'subscription'
      });

      // Then create invoice
      const invoice = await client.invoices.create({
        plan_id: plan.id,
        customer: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      expect(invoice.id).toMatch(/^inv_/);
      expect(invoice.plan_id).toBe(plan.id);
      expect(invoice.customer.email).toBe('test@example.com');
    });

    test('should simulate payment in test mode', async () => {
      const invoice = await client.invoices.create({
        plan_id: 'plan_test_123',
        customer: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      await client.invoices.simulatePayment(invoice.id, {
        success: true,
        delay: 100
      });

      // Verify payment was processed
      const updatedInvoice = await client.invoices.get(invoice.id);
      expect(updatedInvoice.status).toBe('paid');
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration.test.ts
import { TestApiServer } from '../src/api/test-server';
import { BillingClient } from '../src/sdk';
import { DiscordRoleManager } from '../src/discord';

describe('Integration Tests', () => {
  let testServer: TestApiServer;
  let client: BillingClient;

  beforeAll(async () => {
    testServer = new TestApiServer();
    await testServer.start(3003);
    
    client = new BillingClient({
      apiKey: 'test_integration',
      baseUrl: 'http://localhost:3003'
    });
  });

  afterAll(async () => {
    await testServer.stop();
  });

  test('complete subscription flow', async () => {
    // 1. Create plan
    const plan = await client.plans.create({
      name: 'Integration Test Plan',
      amount: 2999,
      currency: 'USD',
      interval: 'month',
      type: 'subscription'
    });

    // 2. Create invoice
    const invoice = await client.invoices.create({
      plan_id: plan.id,
      customer: {
        email: 'integration@test.com',
        name: 'Integration Test User'
      }
    });

    // 3. Simulate payment
    await client.invoices.simulatePayment(invoice.id, {
      success: true
    });

    // 4. Verify payment
    const paidInvoice = await client.invoices.get(invoice.id);
    expect(paidInvoice.status).toBe('paid');

    // 5. Create refund
    const refund = await client.refunds.create({
      invoice_id: invoice.id,
      amount: plan.amount,
      reason: 'customer_request'
    });

    expect(refund.status).toBe('pending');
  });

  test('webhook event processing', async () => {
    const events = await client.webhooks.listEvents({
      type: 'invoice.paid',
      limit: 5
    });

    expect(Array.isArray(events.data)).toBe(true);
    
    if (events.data.length > 0) {
      const event = events.data[0];
      expect(event.type).toBe('invoice.paid');
      expect(event.data).toBeDefined();
    }
  });
});
```

### End-to-End Tests

```typescript
// tests/e2e.test.ts
import puppeteer from 'puppeteer';
import { TestApiServer } from '../src/api/test-server';

describe('E2E Tests', () => {
  let browser: any;
  let page: any;
  let testServer: TestApiServer;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    
    testServer = new TestApiServer();
    await testServer.start(3004);
  });

  afterAll(async () => {
    await browser.close();
    await testServer.stop();
  });

  test('payment flow with QR code', async () => {
    // Navigate to payment page
    await page.goto('http://localhost:3004/docs');
    
    // Check if API documentation loads
    await page.waitForSelector('h1');
    const title = await page.$eval('h1', el => el.textContent);
    expect(title).toContain('API Documentation');

    // Test API endpoints
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/v1/plans', {
        headers: { 'X-API-Key': 'test_12345' }
      });
      return res.json();
    });

    expect(response.success).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
  });
});
```

---

These examples demonstrate practical usage patterns for the Billing System CLI and SDK. For more specific use cases or custom implementations, refer to the [API Reference](./api-reference.md) and [Developer Onboarding Guide](./developer-onboarding.md).