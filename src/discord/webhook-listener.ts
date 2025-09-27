import express, { Request, Response } from 'express';
import { WebhookVerifier } from '../utils/webhook';
import { DiscordRoleManager } from './client';
import { DiscordConfigManager } from './config';
import { WebhookEvent } from '../types/index';

export interface WebhookListenerConfig {
  port: number;
  path: string;
  secret: string;
  discordConfig?: string; // Path to Discord config file
}

export interface ProcessedWebhookResult {
  success: boolean;
  message: string;
  eventType: string;
  discordAction?: 'grant' | 'revoke' | 'none';
  roleResult?: {
    success: boolean;
    message: string;
    roleId?: string;
    roleName?: string;
  };
}

export class DiscordWebhookListener {
  private app: express.Application;
  private server: any;
  private config: WebhookListenerConfig;
  private webhookVerifier: WebhookVerifier;
  private discordManager: DiscordRoleManager | null = null;
  private discordConfigManager: DiscordConfigManager;
  private isRunning: boolean = false;

  constructor(config: WebhookListenerConfig) {
    this.config = config;
    this.app = express();
    this.webhookVerifier = new WebhookVerifier(config.secret);
    this.discordConfigManager = new DiscordConfigManager();

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Set up Express middleware
   */
  private setupMiddleware(): void {
    // Raw body parser for webhook signature verification
    this.app.use(this.config.path, express.raw({ type: 'application/json' }));
    
    // JSON parser for other routes
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Set up Express routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        discord: {
          connected: this.discordManager?.isConnected() || false,
          guild: this.discordManager?.getGuildInfo() || null
        }
      });
    });

    // Webhook endpoint
    this.app.post(this.config.path, async (req: Request, res: Response) => {
      try {
        const result = await this.processWebhook(req);
        
        res.status(200).json({
          success: result.success,
          message: result.message,
          processed: true
        });
      } catch (error) {
        console.error('Webhook processing error:', error);
        
        res.status(400).json({
          success: false,
          message: error instanceof Error ? error.message : 'Webhook processing failed',
          processed: false
        });
      }
    });

    // Discord status endpoint
    this.app.get('/discord/status', async (req: Request, res: Response) => {
      if (!this.discordManager) {
        return res.json({
          connected: false,
          message: 'Discord not configured'
        });
      }

      const testResult = await this.discordManager.testConnection();
      res.json(testResult);
    });

    // Plan role mappings endpoint
    this.app.get('/discord/mappings', async (req: Request, res: Response) => {
      try {
        const mappings = await this.discordConfigManager.listPlanRoleMappings();
        res.json({ success: true, mappings });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Test webhook failed'
        });
      }
    });

    // Test webhook endpoint
    this.app.post('/test', async (req: Request, res: Response) => {
      try {
        const { eventType, data } = req.body;
        
        if (!eventType || !data) {
          return res.status(400).json({
            success: false,
            message: 'eventType and data are required'
          });
        }

        const mockEvent: WebhookEvent = {
          id: `test_${Date.now()}`,
          type: eventType,
          data,
          timestamp: new Date(),
          signature: 'test_signature'
        };

        const result = await this.processWebhookEvent(mockEvent);
        
        res.json({
          success: true,
          message: 'Test webhook processed',
          result
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Test webhook failed'
        });
      }
    });
  }

  /**
   * Initialize Discord connection
   */
  async initializeDiscord(): Promise<void> {
    try {
      // Load Discord configuration
      const discordConfig = await this.discordConfigManager.loadConfig();
      
      if (!discordConfig || !discordConfig.botToken || !discordConfig.guildId) {
        throw new Error('Discord configuration incomplete. Please run discord config command.');
      }

      // Create and connect Discord manager
      this.discordManager = new DiscordRoleManager(discordConfig);
      await this.discordManager.connect();
      
      console.log('Discord connection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Discord:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Start the webhook listener server
   */
  async start(): Promise<void> {
    try {
      // Initialize Discord first
      await this.initializeDiscord();

      // Start Express server
      this.server = this.app.listen(this.config.port, () => {
        console.log(`Discord webhook listener started on port ${this.config.port}`);
        console.log(`Webhook endpoint: http://localhost:${this.config.port}${this.config.path}`);
        console.log(`Health check: http://localhost:${this.config.port}/health`);
        this.isRunning = true;
      });

      // Handle server errors
      this.server.on('error', (error: Error) => {
        console.error('Server error:', error);
        this.isRunning = false;
      });

    } catch (error) {
      console.error('Failed to start webhook listener:', error);
      throw error;
    }
  }

  /**
   * Stop the webhook listener server
   */
  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => {
          console.log('Webhook listener server stopped');
          resolve();
        });
      });
    }

    if (this.discordManager) {
      await this.discordManager.disconnect();
      console.log('Discord connection closed');
    }

    this.isRunning = false;
  }

  /**
   * Process incoming webhook request
   */
  private async processWebhook(req: Request): Promise<ProcessedWebhookResult> {
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;
    const payload = req.body;

    if (!signature || !timestamp) {
      throw new Error('Missing required headers: x-signature, x-timestamp');
    }

    // Verify webhook signature
    const verification = this.webhookVerifier.verifyWebhook(
      payload,
      signature,
      timestamp
    );

    if (!verification.isValid) {
      throw new Error(`Webhook verification failed: ${verification.error}`);
    }

    // Parse webhook event
    let event: WebhookEvent;
    try {
      event = JSON.parse(payload.toString());
    } catch (error) {
      throw new Error('Invalid JSON payload');
    }

    // Process the event
    return await this.processWebhookEvent(event);
  }

  /**
   * Process webhook event and handle Discord role management
   */
  private async processWebhookEvent(event: WebhookEvent): Promise<ProcessedWebhookResult> {
    console.log(`Processing webhook event: ${event.type}`, event.data);

    if (!this.discordManager) {
      return {
        success: false,
        message: 'Discord not connected',
        eventType: event.type,
        discordAction: 'none'
      };
    }

    try {
      switch (event.type) {
        case 'invoice.paid':
          return await this.handleInvoicePaid(event);
        
        case 'subscription.expired':
          return await this.handleSubscriptionExpired(event);
        
        case 'refund.completed':
          return await this.handleRefundCompleted(event);
        
        case 'subscription.cancelled':
          return await this.handleSubscriptionCancelled(event);
        
        default:
          return {
            success: true,
            message: `Event type ${event.type} ignored`,
            eventType: event.type,
            discordAction: 'none'
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to process event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        eventType: event.type,
        discordAction: 'none'
      };
    }
  }

  /**
   * Handle invoice.paid event - grant Discord role
   */
  private async handleInvoicePaid(event: WebhookEvent): Promise<ProcessedWebhookResult> {
    const { invoice } = event.data;
    
    if (!invoice?.planId || !invoice?.metadata?.discordUserId) {
      return {
        success: false,
        message: 'Missing planId or discordUserId in invoice data',
        eventType: event.type,
        discordAction: 'none'
      };
    }

    const roleResult = await this.discordManager!.grantRole(
      invoice.metadata.discordUserId,
      invoice.planId
    );

    return {
      success: roleResult.success,
      message: `Invoice paid processed: ${roleResult.message}`,
      eventType: event.type,
      discordAction: 'grant',
      roleResult
    };
  }

  /**
   * Handle subscription.expired event - revoke Discord role
   */
  private async handleSubscriptionExpired(event: WebhookEvent): Promise<ProcessedWebhookResult> {
    const { subscription } = event.data;
    
    if (!subscription?.planId || !subscription?.metadata?.discordUserId) {
      return {
        success: false,
        message: 'Missing planId or discordUserId in subscription data',
        eventType: event.type,
        discordAction: 'none'
      };
    }

    const roleResult = await this.discordManager!.revokeRole(
      subscription.metadata.discordUserId,
      subscription.planId
    );

    return {
      success: roleResult.success,
      message: `Subscription expired processed: ${roleResult.message}`,
      eventType: event.type,
      discordAction: 'revoke',
      roleResult
    };
  }

  /**
   * Handle refund.completed event - revoke Discord role
   */
  private async handleRefundCompleted(event: WebhookEvent): Promise<ProcessedWebhookResult> {
    const { refund, invoice } = event.data;
    
    if (!invoice?.planId || !invoice?.metadata?.discordUserId) {
      return {
        success: false,
        message: 'Missing planId or discordUserId in refund data',
        eventType: event.type,
        discordAction: 'none'
      };
    }

    const roleResult = await this.discordManager!.revokeRole(
      invoice.metadata.discordUserId,
      invoice.planId
    );

    return {
      success: roleResult.success,
      message: `Refund completed processed: ${roleResult.message}`,
      eventType: event.type,
      discordAction: 'revoke',
      roleResult
    };
  }

  /**
   * Handle subscription.cancelled event - revoke Discord role
   */
  private async handleSubscriptionCancelled(event: WebhookEvent): Promise<ProcessedWebhookResult> {
    const { subscription } = event.data;
    
    if (!subscription?.planId || !subscription?.metadata?.discordUserId) {
      return {
        success: false,
        message: 'Missing planId or discordUserId in subscription data',
        eventType: event.type,
        discordAction: 'none'
      };
    }

    const roleResult = await this.discordManager!.revokeRole(
      subscription.metadata.discordUserId,
      subscription.planId
    );

    return {
      success: roleResult.success,
      message: `Subscription cancelled processed: ${roleResult.message}`,
      eventType: event.type,
      discordAction: 'revoke',
      roleResult
    };
  }

  /**
   * Get listener status
   */
  getStatus(): {
    running: boolean;
    port: number;
    discord: {
      connected: boolean;
      guild: any;
    };
  } {
    return {
      running: this.isRunning,
      port: this.config.port,
      discord: {
        connected: this.discordManager?.isConnected() || false,
        guild: this.discordManager?.getGuildInfo() || null
      }
    };
  }
}