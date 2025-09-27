# API Reference

This document provides comprehensive reference for the Billing System API endpoints and Node.js SDK.

## 📋 Table of Contents

- [Authentication](#authentication)
- [Base URLs](#base-urls)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Plans API](#plans-api)
- [Invoices API](#invoices-api)
- [Refunds API](#refunds-api)
- [Webhooks API](#webhooks-api)
- [Node.js SDK](#nodejs-sdk)
- [Test API](#test-api)

## 🔐 Authentication

All API requests require authentication using an API key in the `X-API-Key` header.

### API Key Format
- **Test Environment**: `test_` prefix (e.g., `test_12345`)
- **Live Environment**: `live_` prefix (e.g., `live_abcdef`)

### Example Request
```bash
curl -H "X-API-Key: test_12345" \
     -H "Content-Type: application/json" \
     https://api.billing.example.com/api/v1/plans
```

## 🌐 Base URLs

- **Production**: `https://api.billing.example.com`
- **Development**: `http://localhost:3000`
- **Test Server**: `http://localhost:3002`

## 📄 Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_123456"
  }
}
```

### List Response with Pagination
```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5,
    "has_next": true,
    "has_prev": false
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_123456"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request is invalid",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_123456"
  }
}
```

## ⚠️ Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

### Error Codes
- `INVALID_API_KEY` - API key is missing or invalid
- `INVALID_REQUEST` - Request parameters are invalid
- `NOT_FOUND` - Resource not found
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error

## 🚦 Rate Limiting

- **Limit**: 100 requests per minute per API key
- **Headers**: Rate limit information in response headers
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## 💳 Plans API

### List Plans

**GET** `/api/v1/plans`

Retrieve a list of billing plans.

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | integer | Page number | 1 |
| `limit` | integer | Items per page (max 100) | 20 |
| `status` | string | Filter by status (`active`, `inactive`) | all |
| `type` | string | Filter by type (`subscription`, `one_time`) | all |

#### Example Request
```bash
curl -H "X-API-Key: test_12345" \
     "https://api.billing.example.com/api/v1/plans?status=active&limit=10"
```

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "plan_123",
      "name": "Pro Plan",
      "description": "Professional features",
      "amount": 2999,
      "currency": "USD",
      "interval": "month",
      "interval_count": 1,
      "type": "subscription",
      "status": "active",
      "features": ["feature1", "feature2"],
      "metadata": {},
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3,
    "has_next": true,
    "has_prev": false
  }
}
```

### Get Plan

**GET** `/api/v1/plans/{plan_id}`

Retrieve a specific plan by ID.

#### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `plan_id` | string | Plan identifier |

#### Example Request
```bash
curl -H "X-API-Key: test_12345" \
     "https://api.billing.example.com/api/v1/plans/plan_123"
```

### Create Plan

**POST** `/api/v1/plans`

Create a new billing plan.

#### Request Body
```json
{
  "name": "Premium Plan",
  "description": "Premium features with priority support",
  "amount": 4999,
  "currency": "USD",
  "interval": "month",
  "interval_count": 1,
  "type": "subscription",
  "features": ["premium_feature1", "premium_feature2"],
  "metadata": {
    "category": "premium"
  }
}
```

#### Required Fields
- `name` (string): Plan name
- `amount` (integer): Amount in cents
- `currency` (string): Currency code (ISO 4217)
- `interval` (string): Billing interval (`day`, `week`, `month`, `year`)
- `type` (string): Plan type (`subscription`, `one_time`)

#### Example Request
```bash
curl -X POST \
     -H "X-API-Key: test_12345" \
     -H "Content-Type: application/json" \
     -d '{"name":"Premium Plan","amount":4999,"currency":"USD","interval":"month","type":"subscription"}' \
     "https://api.billing.example.com/api/v1/plans"
```

### Update Plan

**PUT** `/api/v1/plans/{plan_id}`

Update an existing plan.

#### Request Body
```json
{
  "name": "Updated Premium Plan",
  "description": "Updated description",
  "metadata": {
    "category": "premium",
    "updated": true
  }
}
```

### Delete Plan

**DELETE** `/api/v1/plans/{plan_id}`

Delete a plan (soft delete - sets status to inactive).

## 🧾 Invoices API

### List Invoices

**GET** `/api/v1/invoices`

Retrieve a list of invoices.

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | integer | Page number | 1 |
| `limit` | integer | Items per page (max 100) | 20 |
| `status` | string | Filter by status | all |
| `customer_email` | string | Filter by customer email | - |
| `plan_id` | string | Filter by plan ID | - |

#### Invoice Statuses
- `draft` - Invoice created but not sent
- `pending` - Awaiting payment
- `paid` - Payment completed
- `failed` - Payment failed
- `cancelled` - Invoice cancelled
- `refunded` - Payment refunded

#### Example Request
```bash
curl -H "X-API-Key: test_12345" \
     "https://api.billing.example.com/api/v1/invoices?status=paid&limit=10"
```

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "inv_123",
      "plan_id": "plan_123",
      "customer": {
        "email": "customer@example.com",
        "name": "John Doe"
      },
      "amount": 2999,
      "currency": "USD",
      "status": "paid",
      "due_date": "2024-02-15T00:00:00Z",
      "paid_at": "2024-01-15T10:30:00Z",
      "payment_url": "https://pay.example.com/inv_123",
      "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "metadata": {},
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Get Invoice

**GET** `/api/v1/invoices/{invoice_id}`

Retrieve a specific invoice by ID.

### Create Invoice

**POST** `/api/v1/invoices`

Create a new invoice.

#### Request Body
```json
{
  "plan_id": "plan_123",
  "customer": {
    "email": "customer@example.com",
    "name": "John Doe"
  },
  "due_date": "2024-02-15T00:00:00Z",
  "metadata": {
    "order_id": "order_456"
  }
}
```

#### Required Fields
- `plan_id` (string): Plan identifier
- `customer.email` (string): Customer email
- `customer.name` (string): Customer name

### Update Invoice Status

**PATCH** `/api/v1/invoices/{invoice_id}/status`

Update invoice status.

#### Request Body
```json
{
  "status": "paid",
  "paid_at": "2024-01-15T10:30:00Z"
}
```

### Generate QR Code

**GET** `/api/v1/invoices/{invoice_id}/qr`

Generate QR code for invoice payment.

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `size` | integer | QR code size in pixels | 200 |
| `format` | string | Response format (`json`, `png`) | json |

### Simulate Payment (Development Only)

**POST** `/api/v1/invoices/{invoice_id}/simulate-payment`

Simulate payment for testing purposes (only available with test API keys).

#### Request Body
```json
{
  "success": true,
  "delay": 1000
}
```

## 💰 Refunds API

### List Refunds

**GET** `/api/v1/refunds`

Retrieve a list of refunds.

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | integer | Page number | 1 |
| `limit` | integer | Items per page (max 100) | 20 |
| `status` | string | Filter by status | all |
| `invoice_id` | string | Filter by invoice ID | - |

#### Refund Statuses
- `pending` - Refund initiated
- `processing` - Refund being processed
- `completed` - Refund completed
- `failed` - Refund failed
- `cancelled` - Refund cancelled

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "ref_123",
      "invoice_id": "inv_123",
      "amount": 2999,
      "currency": "USD",
      "reason": "customer_request",
      "status": "completed",
      "processed_at": "2024-01-15T10:30:00Z",
      "metadata": {},
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Get Refund

**GET** `/api/v1/refunds/{refund_id}`

Retrieve a specific refund by ID.

### Create Refund

**POST** `/api/v1/refunds`

Create a new refund.

#### Request Body
```json
{
  "invoice_id": "inv_123",
  "amount": 2999,
  "reason": "customer_request",
  "metadata": {
    "support_ticket": "ticket_789"
  }
}
```

#### Required Fields
- `invoice_id` (string): Invoice identifier
- `amount` (integer): Refund amount in cents
- `reason` (string): Refund reason

#### Refund Reasons
- `customer_request` - Customer requested refund
- `duplicate` - Duplicate payment
- `fraudulent` - Fraudulent transaction
- `other` - Other reason

### Update Refund Status

**PATCH** `/api/v1/refunds/{refund_id}/status`

Update refund status.

#### Request Body
```json
{
  "status": "completed",
  "processed_at": "2024-01-15T10:30:00Z"
}
```

## 🔗 Webhooks API

### List Webhook Events

**GET** `/api/v1/webhooks/events`

Retrieve a list of webhook events.

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | integer | Page number | 1 |
| `limit` | integer | Items per page (max 100) | 20 |
| `type` | string | Filter by event type | all |
| `status` | string | Filter by delivery status | all |

#### Event Types
- `invoice.created` - Invoice created
- `invoice.paid` - Invoice paid
- `invoice.failed` - Payment failed
- `subscription.created` - Subscription created
- `subscription.updated` - Subscription updated
- `subscription.cancelled` - Subscription cancelled
- `subscription.expired` - Subscription expired
- `refund.created` - Refund created
- `refund.completed` - Refund completed
- `refund.failed` - Refund failed

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "evt_123",
      "type": "invoice.paid",
      "data": {
        "invoice": {
          "id": "inv_123",
          "status": "paid",
          "amount": 2999
        }
      },
      "created_at": "2024-01-15T10:30:00Z",
      "delivery_attempts": 1,
      "delivered_at": "2024-01-15T10:30:05Z",
      "status": "delivered"
    }
  ]
}
```

### Verify Webhook

**POST** `/api/v1/webhooks/verify`

Verify webhook signature.

#### Request Body
```json
{
  "payload": "{\"type\":\"invoice.paid\",\"data\":{...}}",
  "signature": "sha256=abc123...",
  "timestamp": "1705312200",
  "secret": "whsec_abc123..."
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "valid": true,
    "event_type": "invoice.paid"
  }
}
```

## 📦 Node.js SDK

### Installation

```bash
npm install @your-org/billing-sdk
```

### Basic Usage

```typescript
import { BillingClient } from '@your-org/billing-sdk';

const client = new BillingClient({
  apiKey: 'test_12345',
  baseUrl: 'https://api.billing.example.com'
});
```

### Configuration Options

```typescript
interface BillingClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
}
```

### Plans Resource

```typescript
// List plans
const plans = await client.plans.list({
  status: 'active',
  limit: 10
});

// Get plan
const plan = await client.plans.get('plan_123');

// Create plan
const newPlan = await client.plans.create({
  name: 'Premium Plan',
  amount: 4999,
  currency: 'USD',
  interval: 'month',
  type: 'subscription'
});

// Update plan
const updatedPlan = await client.plans.update('plan_123', {
  name: 'Updated Premium Plan'
});

// Delete plan
await client.plans.delete('plan_123');
```

### Invoices Resource

```typescript
// List invoices
const invoices = await client.invoices.list({
  status: 'paid',
  limit: 10
});

// Get invoice
const invoice = await client.invoices.get('inv_123');

// Create invoice
const newInvoice = await client.invoices.create({
  plan_id: 'plan_123',
  customer: {
    email: 'customer@example.com',
    name: 'John Doe'
  }
});

// Update invoice status
await client.invoices.updateStatus('inv_123', {
  status: 'paid',
  paid_at: new Date().toISOString()
});

// Generate QR code
const qrCode = await client.invoices.generateQR('inv_123', {
  size: 300,
  format: 'json'
});

// Simulate payment (test only)
await client.invoices.simulatePayment('inv_123', {
  success: true,
  delay: 1000
});
```

### Refunds Resource

```typescript
// List refunds
const refunds = await client.refunds.list({
  status: 'completed',
  limit: 10
});

// Get refund
const refund = await client.refunds.get('ref_123');

// Create refund
const newRefund = await client.refunds.create({
  invoice_id: 'inv_123',
  amount: 2999,
  reason: 'customer_request'
});

// Update refund status
await client.refunds.updateStatus('ref_123', {
  status: 'completed',
  processed_at: new Date().toISOString()
});
```

### Webhooks Resource

```typescript
// List webhook events
const events = await client.webhooks.listEvents({
  type: 'invoice.paid',
  limit: 10
});

// Verify webhook
const isValid = await client.webhooks.verify({
  payload: webhookPayload,
  signature: webhookSignature,
  timestamp: webhookTimestamp,
  secret: webhookSecret
});
```

### Error Handling

```typescript
import { BillingError } from '@your-org/billing-sdk';

try {
  const plan = await client.plans.get('invalid_id');
} catch (error) {
  if (error instanceof BillingError) {
    console.error('Billing API Error:', error.message);
    console.error('Error Code:', error.code);
    console.error('Status Code:', error.statusCode);
  } else {
    console.error('Unexpected Error:', error);
  }
}
```

### TypeScript Support

The SDK includes full TypeScript definitions:

```typescript
import { Plan, Invoice, Refund, WebhookEvent } from '@your-org/billing-sdk';

const plan: Plan = await client.plans.get('plan_123');
const invoice: Invoice = await client.invoices.get('inv_123');
```

## 🧪 Test API

The test API server provides additional endpoints for development and testing.

### Base URL
`http://localhost:3002`

### Test Utilities

#### Reset Test Data

**POST** `/api/v1/test/reset`

Reset all test data to initial state.

#### Generate Test Data

**POST** `/api/v1/test/generate`

Generate random test data.

#### Request Body
```json
{
  "plans": 5,
  "invoices": 20,
  "refunds": 5,
  "events": 10
}
```

#### Get Fixtures

**GET** `/api/v1/test/fixtures`

Get sample test data fixtures.

### Mock Webhook Events

#### Trigger Webhook Event

**POST** `/api/v1/test/webhook-events`

Manually trigger a webhook event for testing.

#### Request Body
```json
{
  "type": "invoice.paid",
  "data": {
    "invoice_id": "inv_123"
  }
}
```

## 📊 Response Examples

### Successful List Response
```json
{
  "success": true,
  "data": [
    {
      "id": "plan_123",
      "name": "Pro Plan",
      "amount": 2999,
      "currency": "USD"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1,
    "has_next": false,
    "has_prev": false
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_123456"
  }
}
```

### Error Response Examples

#### Invalid API Key
```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_123456"
  }
}
```

#### Validation Error
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Validation failed",
    "details": {
      "amount": "Amount must be a positive integer",
      "currency": "Currency must be a valid ISO 4217 code"
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_123456"
  }
}
```

#### Rate Limit Error
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retry_after": 60
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_123456"
  }
}
```

## 🔧 SDK Configuration Examples

### Basic Configuration
```typescript
const client = new BillingClient({
  apiKey: 'test_12345'
});
```

### Advanced Configuration
```typescript
const client = new BillingClient({
  apiKey: 'live_abcdef',
  baseUrl: 'https://api.billing.example.com',
  timeout: 30000,
  retries: 3,
  debug: true
});
```

### Environment-based Configuration
```typescript
const client = new BillingClient({
  apiKey: process.env.BILLING_API_KEY!,
  baseUrl: process.env.BILLING_API_URL || 'https://api.billing.example.com',
  debug: process.env.NODE_ENV === 'development'
});
```

---

For more examples and advanced usage, see the [Examples Documentation](./examples.md).