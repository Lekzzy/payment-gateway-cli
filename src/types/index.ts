// Core billing system types
export interface BillingConfig {
  apiKey: string;
  merchantWallet: string;
  baseUrl?: string;
  environment?: 'test' | 'live';
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly' | 'weekly' | 'daily' | 'month' | 'year' | 'week' | 'day';
  description?: string;
  features?: string[];
  metadata?: Record<string, any>;
  active?: boolean;
  intervalCount?: number;
  trialDays?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Invoice {
  id: string;
  planId: string;
  wallet?: string;
  amount: number;
  currency: string;
  status: 'unpaid' | 'processing' | 'paid' | 'failed' | 'refunded' | 'pending' | 'overdue' | 'cancelled';
  description?: string;
  merchantName?: string;
  expiryTime?: Date;
  dueDate?: Date | string;
  paidAt?: Date | string;
  metadata?: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
  paymentUrl?: string;
}

export interface Refund {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  reason?: string;
  status: 'pending' | 'completed' | 'failed';
  processedAt?: Date | string;
  metadata?: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WebhookEvent {
  id: string;
  type: 'invoice.paid' | 'invoice.failed' | 'subscription.expired' | 'refund.completed' | 'subscription.cancelled';
  data: any;
  timestamp: Date;
  signature: string;
}

export interface DiscordConfig {
  botToken: string;
  guildId: string;
  planRoleMapping: Record<string, { roleId: string; roleName?: string; createdAt?: Date }>; // planId -> role info
  webhookSecret?: string;
  retryAttempts?: number;
  retryDelay?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// Telegram adapter types
export interface TelegramConfig {
  botToken: string;
  adminChatId: string; // chat id for admin alerts
  planGroupMapping: Record<string, { chatId: string; title?: string; createdAt?: Date }>; // planId -> group/channel chat id
  webhookSecret?: string;
  retryAttempts?: number;
  retryDelay?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// CLI specific types
export interface CLIConfig extends BillingConfig {
  configPath?: string;
  updatedAt?: string;
}

// SDK client options
export interface BillingClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

// Webhook verification
export interface WebhookVerificationResult {
  isValid: boolean;
  event?: WebhookEvent;
  error?: string;
}