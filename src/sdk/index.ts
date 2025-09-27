// Main SDK exports
import { BillingClient } from './client';
export { BillingClient } from './client';
export { WebhookVerifier } from '../utils/webhook';

// Types
export type {
  Plan,
  Invoice,
  Refund,
  WebhookEvent,
  BillingConfig,
  DiscordConfig,
  ApiResponse,
  PaginatedResponse,
  CLIConfig,
  BillingClientOptions,
  WebhookVerificationResult
} from '../types/index';

// Resources
export { PlansResource } from './resources/plans';
export { InvoicesResource } from './resources/invoices';
export { RefundsResource } from './resources/refunds';
export { WebhooksResource } from './resources/webhooks';

// Utilities
export { MockApiService } from '../utils/mockApi';
export { ConfigManager } from '../utils/config';

// Version
export const VERSION = '1.0.0';

// Default export for convenience
export default BillingClient;