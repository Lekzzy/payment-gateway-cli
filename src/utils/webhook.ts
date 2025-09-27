import * as crypto from 'crypto';
import { WebhookEvent, WebhookVerificationResult } from '../types/index';

export class WebhookVerifier {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   */
  verifySignature(payload: string, signature: string, timestamp?: string): boolean {
    try {
      // Remove 'sha256=' prefix if present
      const cleanSignature = signature.replace(/^sha256=/, '');
      
      // Create the payload to sign (include timestamp if provided for replay protection)
      const payloadToSign = timestamp ? `${timestamp}.${payload}` : payload;
      
      // Generate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(payloadToSign, 'utf8')
        .digest('hex');
      
      // Use timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(cleanSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Verify webhook with replay protection (5 minute tolerance)
   */
  verifyWebhook(
    payload: string, 
    signature: string, 
    timestamp: string,
    toleranceSeconds: number = 300
  ): WebhookVerificationResult {
    try {
      // Parse timestamp
      const webhookTime = parseInt(timestamp, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Check if timestamp is within tolerance
      if (Math.abs(currentTime - webhookTime) > toleranceSeconds) {
        return {
          isValid: false,
          error: 'Webhook timestamp is too old or too far in the future'
        };
      }
      
      // Verify signature
      if (!this.verifySignature(payload, signature, timestamp)) {
        return {
          isValid: false,
          error: 'Invalid webhook signature'
        };
      }
      
      // Parse webhook event
      const event: WebhookEvent = JSON.parse(payload);
      
      return {
        isValid: true,
        event
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Webhook verification failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Generate signature for outgoing webhooks (for testing)
   */
  generateSignature(payload: string, timestamp?: string): string {
    const payloadToSign = timestamp ? `${timestamp}.${payload}` : payload;
    
    return crypto
      .createHmac('sha256', this.secret)
      .update(payloadToSign, 'utf8')
      .digest('hex');
  }

  /**
   * Create a test webhook with proper signature
   */
  createTestWebhook(type: WebhookEvent['type'], data: any): {
    payload: string;
    signature: string;
    timestamp: string;
  } {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    const event: WebhookEvent = {
      id: `wh_test_${Date.now()}`,
      type,
      data,
      timestamp: new Date(),
      signature: '' // Will be set below
    };
    
    const payload = JSON.stringify(event);
    const signature = this.generateSignature(payload, timestamp);
    
    // Update the event with the signature
    event.signature = signature;
    const finalPayload = JSON.stringify(event);
    
    return {
      payload: finalPayload,
      signature: `sha256=${signature}`,
      timestamp
    };
  }
}

/**
 * Utility function for quick webhook verification
 */
export function verifyWebhookQuick(
  payload: string,
  signature: string,
  secret: string,
  timestamp?: string
): boolean {
  const verifier = new WebhookVerifier(secret);
  return verifier.verifySignature(payload, signature, timestamp);
}

/**
 * Example webhook verification snippet for documentation
 */
export const webhookVerificationExample = `
// Webhook verification example
import { WebhookVerifier } from '../sdk/index';

const verifier = new WebhookVerifier('your_webhook_secret');

app.post('/webhooks/billing', (req, res) => {
  const signature = req.headers['x-billing-signature'];
  const timestamp = req.headers['x-billing-timestamp'];
  const payload = JSON.stringify(req.body);
  
  const result = verifier.verifyWebhook(payload, signature, timestamp);
  
  if (!result.isValid) {
    return res.status(400).json({ error: result.error });
  }
  
  const event = result.event;
  
  switch (event.type) {
    case 'invoice.paid':
      // Handle payment success
      console.log('Payment received:', event.data);
      break;
    case 'subscription.expired':
      // Handle subscription expiration
      console.log('Subscription expired:', event.data);
      break;
    default:
      console.log('Unknown event type:', event.type);
  }
  
  res.status(200).json({ received: true });
});
`;