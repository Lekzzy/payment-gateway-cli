import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { BillingClientOptions } from '../types/index';
import { PlansResource } from './resources/plans';
import { InvoicesResource } from './resources/invoices';
import { RefundsResource } from './resources/refunds';
import { WebhooksResource } from './resources/webhooks';

export class BillingClient {
  private httpClient: AxiosInstance;
  private options: Required<BillingClientOptions>;

  // Resource instances
  public readonly plans: PlansResource;
  public readonly invoices: InvoicesResource;
  public readonly refunds: RefundsResource;
  public readonly webhooks: WebhooksResource;

  constructor(options: BillingClientOptions) {
    // Set default options
    this.options = {
      apiKey: options.apiKey,
      baseUrl: options.baseUrl || 'https://api.billing.test',
      timeout: options.timeout || 30000,
      retries: options.retries || 3
    };

    // Validate API key
    if (!this.options.apiKey) {
      throw new Error('API key is required');
    }

    if (!(this.options.apiKey.startsWith('test_') || this.options.apiKey.startsWith('live_'))) {
      throw new Error('API key must start with test_ or live_');
    }

    // Create HTTP client
    this.httpClient = axios.create({
      baseURL: this.options.baseUrl,
      timeout: this.options.timeout,
      headers: {
        'Authorization': `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': `billing-sdk-node/1.0.0`,
        'Accept': 'application/json'
      }
    });

    // Add request interceptor for retries
    this.setupRetryInterceptor();

    // Response interceptor not altering payload to preserve API shapes

    // Initialize resource instances
    this.plans = new PlansResource(this.httpClient);
    this.invoices = new InvoicesResource(this.httpClient);
    this.refunds = new RefundsResource(this.httpClient);
    this.webhooks = new WebhooksResource(this.httpClient);
  }

  /**
   * Set up retry interceptor for failed requests
   */
  private setupRetryInterceptor(): void {
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config as AxiosRequestConfig & { _retryCount?: number };
        
        // Don't retry if we've exceeded max retries
        if (!config || (config._retryCount ?? 0) >= this.options.retries) {
          return Promise.reject(error);
        }

        // Only retry on network errors or 5xx status codes
        const shouldRetry = !error.response || (error.response.status >= 500 && error.response.status < 600);
        
        if (!shouldRetry) {
          return Promise.reject(error);
        }

        // Increment retry count
        config._retryCount = (config._retryCount || 0) + 1;

        // Calculate delay (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, config._retryCount - 1), 10000);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));

        // Retry the request
        return this.httpClient(config);
      }
    );
  }

  /**
   * Set up response interceptor for consistent error handling
   */
  private setupResponseInterceptor(): void {
    // Intentionally left as pass-through if needed later
  }

  /**
   * Get client configuration
   */
  getConfig(): { apiKey: string; baseUrl: string; timeout: number } {
    return {
      apiKey: this.options.apiKey,
      baseUrl: this.options.baseUrl,
      timeout: this.options.timeout
    };
  }

  /**
   * Test the connection to the API
   */
  async testConnection(): Promise<{ success: boolean; message: string; latency?: number }> {
    try {
      const startTime = Date.now();
      
      // Make a simple request to test connectivity using a stable endpoint
      await this.httpClient.get('/plans');
      
      const latency = Date.now() - startTime;
      
      return {
        success: true,
        message: 'Connection successful',
        latency
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Update API key
   */
  updateApiKey(apiKey: string): void {
    if (!(apiKey.startsWith('test_') || apiKey.startsWith('live_'))) {
      throw new Error('API key must start with test_ or live_');
    }

    this.options.apiKey = apiKey;
    this.httpClient.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
  }

  /**
   * Update base URL
   */
  updateBaseUrl(baseUrl: string): void {
    this.options.baseUrl = baseUrl;
    this.httpClient.defaults.baseURL = baseUrl;
  }

  /**
   * Update client configuration
   */
  updateConfig(options: Partial<BillingClientOptions>): void {
    if (!options) return;

    if (options.apiKey !== undefined) {
      this.updateApiKey(options.apiKey);
    }

    if (options.baseUrl !== undefined) {
      this.updateBaseUrl(options.baseUrl);
    }

    if (options.timeout !== undefined) {
      this.options.timeout = options.timeout;
      this.httpClient.defaults.timeout = options.timeout;
    }

    if (options.retries !== undefined) {
      this.options.retries = options.retries;
      // Retry interceptor reads this.options.retries dynamically
    }
  }

  /**
   * Get HTTP client instance (for advanced usage)
   */
  getHttpClient(): AxiosInstance {
    return this.httpClient;
  }
}