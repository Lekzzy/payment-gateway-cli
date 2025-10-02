import { AxiosInstance } from 'axios';
import { WebhookEvent, WebhookVerificationResult } from '../../types/index';
import { WebhookVerifier } from '../../utils/webhook';
import { MockApiService } from '../../utils/mockApi';

export class WebhooksResource {
  private httpClient: AxiosInstance;
  private mockApi: MockApiService;
  private verifier: WebhookVerifier;

  constructor(httpClient: AxiosInstance) {
    this.httpClient = httpClient;
    this.mockApi = MockApiService.getInstance();
    this.verifier = new WebhookVerifier('default_secret');
  }

  /**
   * Verify a webhook signature
   */
  verifySignature(
    payload: string,
    signature: string,
    secret: string,
    timestamp?: number
  ): WebhookVerificationResult {
    try {
      // Create a new verifier with the provided secret
      const verifier = new WebhookVerifier(secret);
      const isValid = verifier.verifySignature(payload, signature, timestamp?.toString());
      return {
        isValid,
        error: isValid ? undefined : 'Invalid signature'
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Validate a webhook event
   */
  validateWebhook(
    payload: string,
    signature: string,
    secret: string,
    options?: {
      timestamp?: number;
      tolerance?: number;
      checkReplay?: boolean;
    }
  ): WebhookVerificationResult {
    try {
      // Create a new verifier with the provided secret
      const verifier = new WebhookVerifier(secret);
      const timestamp = options?.timestamp?.toString() || Math.floor(Date.now() / 1000).toString();
      return verifier.verifyWebhook(payload, signature, timestamp, options?.tolerance);
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate a webhook signature for testing
   */
  generateSignature(payload: string, secret: string, timestamp?: number): string {
    // Create a new verifier with the provided secret
    const verifier = new WebhookVerifier(secret);
    return verifier.generateSignature(payload, timestamp?.toString());
  }

  /**
   * Create a test webhook event
   */
  createTestEvent(
    eventType: 'invoice.paid' | 'invoice.failed' | 'subscription.expired' | 'refund.completed',
    data: any,
    options?: {
      timestamp?: number;
      metadata?: Record<string, any>;
    }
  ): WebhookEvent {
    const testWebhook = this.verifier.createTestWebhook(eventType, data);
    const event: WebhookEvent = JSON.parse(testWebhook.payload);
    // Normalize ID to match expected format in tests
    const normalized: WebhookEvent = {
      ...event,
      id: event.id.replace(/^wh_test_/, 'evt_')
    };
    return normalized;
  }

  /**
   * Send a test webhook to a URL
   */
  async sendTestWebhook(
    url: string,
    eventType: 'invoice.paid' | 'invoice.failed' | 'subscription.expired' | 'refund.completed',
    data: any,
    secret: string,
    options?: {
      timeout?: number;
      retries?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    success: boolean;
    statusCode?: number;
    response?: any;
    error?: string;
    signature: string;
    payload: string;
  }> {
    try {
      // Create test webhook event
      const webhookEvent = this.createTestEvent(eventType, data, {
        metadata: options?.metadata
      });

      // Convert to JSON payload
      const payload = JSON.stringify(webhookEvent);

      // Generate signature
      const signature = this.generateSignature(payload, secret, Math.floor(webhookEvent.timestamp.getTime() / 1000));

      // Send webhook
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': webhookEvent.timestamp.toString(),
          'User-Agent': 'billing-webhook/1.0.0'
        },
        body: payload,
        signal: AbortSignal.timeout(options?.timeout || 30000)
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      return {
        success: response.ok,
        statusCode: response.status,
        response: responseData,
        signature,
        payload
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        signature: '',
        payload: ''
      };
    }
  }

  /**
   * Get available webhook event types
   */
  getEventTypes(): Array<{
    type: string;
    description: string;
    dataFields: string[];
  }> {
    return [
      {
        type: 'invoice.paid',
        description: 'Triggered when an invoice is successfully paid',
        dataFields: ['id', 'planId', 'amount', 'currency', 'wallet', 'transactionHash', 'paidAt']
      },
      {
        type: 'invoice.failed',
        description: 'Triggered when an invoice payment fails',
        dataFields: ['id', 'planId', 'amount', 'currency', 'wallet', 'failureReason', 'failedAt']
      },
      {
        type: 'subscription.expired',
        description: 'Triggered when a subscription expires',
        dataFields: ['id', 'planId', 'wallet', 'expiredAt', 'lastInvoiceId']
      },
      {
        type: 'refund.completed',
        description: 'Triggered when a refund is completed',
        dataFields: ['id', 'invoiceId', 'amount', 'currency', 'reason', 'transactionHash', 'completedAt']
      }
    ];
  }

  /**
   * Test webhook endpoint connectivity
   */
  async testEndpoint(url: string, options?: {
    timeout?: number;
    expectedStatusCodes?: number[];
  }): Promise<{
    success: boolean;
    statusCode?: number;
    responseTime?: number;
    error?: string;
    headers?: Record<string, string>;
  }> {
    try {
      const startTime = Date.now();
      
      // Send a simple ping request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'billing-webhook-test/1.0.0'
        },
        body: JSON.stringify({
          type: 'webhook.test',
          timestamp: Date.now(),
          data: { message: 'Test webhook connectivity' }
        }),
        signal: AbortSignal.timeout(options?.timeout || 10000)
      });

      const responseTime = Date.now() - startTime;
      const expectedCodes = options?.expectedStatusCodes || [200, 201, 202, 204];
      
      // Convert headers to plain object
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        success: expectedCodes.includes(response.status),
        statusCode: response.status,
        responseTime,
        headers
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Batch send multiple test webhooks
   */
  async sendBatchTestWebhooks(
    url: string,
    events: Array<{
      type: 'invoice.paid' | 'invoice.failed' | 'subscription.expired' | 'refund.completed';
      data: any;
      delay?: number; // milliseconds
    }>,
    secret: string,
    options?: {
      timeout?: number;
      stopOnError?: boolean;
    }
  ): Promise<Array<{
    event: any;
    success: boolean;
    statusCode?: number;
    error?: string;
    signature: string;
  }>> {
    const results = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Add delay if specified
      if (event.delay && i > 0) {
        await new Promise(resolve => setTimeout(resolve, event.delay));
      }

      try {
        const result = await this.sendTestWebhook(
          url,
          event.type,
          event.data,
          secret,
          { timeout: options?.timeout }
        );

        results.push({
          event,
          success: result.success,
          statusCode: result.statusCode,
          error: result.error,
          signature: result.signature
        });

        // Stop on error if requested
        if (!result.success && options?.stopOnError) {
          break;
        }
      } catch (error) {
        results.push({
          event,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          signature: ''
        });

        if (options?.stopOnError) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload: string): WebhookEvent | null {
    try {
      const parsed = JSON.parse(payload);
      
      // Validate required fields
      if (!parsed.id || !parsed.type || !parsed.timestamp || !parsed.data) {
        return null;
      }

      return parsed as WebhookEvent;
    } catch {
      return null;
    }
  }

  /**
   * Get webhook delivery recommendations
   */
  getDeliveryRecommendations(): Array<{
    category: string;
    recommendation: string;
    importance: 'high' | 'medium' | 'low';
  }> {
    return [
      {
        category: 'Security',
        recommendation: 'Always verify webhook signatures before processing',
        importance: 'high'
      },
      {
        category: 'Security',
        recommendation: 'Use HTTPS endpoints for webhook URLs',
        importance: 'high'
      },
      {
        category: 'Reliability',
        recommendation: 'Implement idempotency to handle duplicate deliveries',
        importance: 'high'
      },
      {
        category: 'Reliability',
        recommendation: 'Return 2xx status codes for successful processing',
        importance: 'high'
      },
      {
        category: 'Performance',
        recommendation: 'Process webhooks asynchronously when possible',
        importance: 'medium'
      },
      {
        category: 'Performance',
        recommendation: 'Respond to webhooks within 30 seconds',
        importance: 'medium'
      },
      {
        category: 'Monitoring',
        recommendation: 'Log webhook events for debugging and monitoring',
        importance: 'medium'
      },
      {
        category: 'Error Handling',
        recommendation: 'Implement exponential backoff for retries',
        importance: 'low'
      }
    ];
  }
}