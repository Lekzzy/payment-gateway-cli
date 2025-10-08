import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ConfigManager } from '../utils/config';
import invoicesRouter from './routes/invoices';

export class ApiServer {
  private app: Application;
  private port: number;
  private configManager: ConfigManager;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.configManager = new ConfigManager();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Set up middleware
   */
  private setupMiddleware(): void {
    // Webhook raw body capture must be registered before JSON parsers
    const apiPrefix = '/api/v1';
    try {
      const webhookSecret = process.env.WEBHOOK_SECRET || 'test_webhook_secret_key';
      const { default: createWebhooksRouter } = require('./routes/webhooks');
      // Mount raw parser for this route specifically
      this.app.use(`${apiPrefix}`, (req, res, next) => {
        if (req.method === 'POST' && req.path === '/webhooks') {
          // Attach rawBody for verification later
          let data: Buffer[] = [];
          req.on('data', (chunk) => data.push(chunk));
          req.on('end', () => {
            (req as any).rawBody = Buffer.concat(data);
            next();
          });
        } else {
          next();
        }
      });
      this.app.use(`${apiPrefix}`, createWebhooksRouter(webhookSecret));
    } catch (e) {
      console.warn('Webhook router setup failed:', e instanceof Error ? e.message : e);
    }
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://pay.billing.test', 'https://dashboard.billing.test']
        : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
      message: {
        success: false,
        error: 'Too many requests, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      });
      
      next();
    });

    // Health check middleware
    this.app.use('/health', (req: Request, res: Response) => {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
      });
    });
  }

  /**
   * Set up API routes
   */
  private setupRoutes(): void {
    // API version prefix
    const apiPrefix = '/api/v1';

    // Invoice routes for hosted pay link
    this.app.use(`${apiPrefix}/invoices`, invoicesRouter);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        success: true,
        message: 'Billing System API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          invoices: `${apiPrefix}/invoices/:id`,
          invoiceStatus: `${apiPrefix}/invoices/:id/status`,
          documentation: '/docs'
        }
      });
    });

    // API documentation endpoint
    this.app.get('/docs', (req: Request, res: Response) => {
      res.json({
        success: true,
        documentation: {
          title: 'Billing System API Documentation',
          version: '1.0.0',
          baseUrl: `${req.protocol}://${req.get('host')}${apiPrefix}`,
          endpoints: [
            {
              method: 'GET',
              path: '/invoices/:id',
              description: 'Get invoice details for hosted pay link',
              parameters: {
                id: 'Invoice ID (required)'
              },
              response: {
                success: 'boolean',
                data: {
                  id: 'string',
                  merchantName: 'string',
                  description: 'string',
                  amount: 'number',
                  currency: 'string',
                  status: 'string',
                  expiryTime: 'string (ISO date)',
                  paymentUrl: 'string'
                }
              }
            },
            {
              method: 'GET',
              path: '/invoices/:id/status',
              description: 'Get invoice status for polling',
              parameters: {
                id: 'Invoice ID (required)'
              },
              response: {
                success: 'boolean',
                data: {
                  id: 'string',
                  status: 'string',
                  lastUpdated: 'string (ISO date)',
                  transactionHash: 'string (optional)'
                }
              }
            },
            {
              method: 'POST',
              path: '/invoices/:id/simulate-payment',
              description: 'Simulate payment (development only)',
              parameters: {
                id: 'Invoice ID (required)',
                transactionHash: 'string (optional)'
              },
              response: {
                success: 'boolean',
                data: {
                  id: 'string',
                  status: 'string',
                  transactionHash: 'string'
                }
              }
            }
          ]
        }
      });
    });

    // 404 handler for API routes
    this.app.use(`${apiPrefix}/*`, (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        path: req.path,
        method: req.method
      });
    });
  }

  /**
   * Set up error handling
   */
  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Unhandled error:', error);

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV !== 'production';

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        ...(isDevelopment && {
          details: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        })
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  /**
   * Start the server
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(this.port, () => {
          console.log(`🚀 Billing API server running on port ${this.port}`);
          console.log(`📖 API Documentation: http://localhost:${this.port}/docs`);
          console.log(`❤️  Health Check: http://localhost:${this.port}/health`);
          console.log(`🔗 Base URL: http://localhost:${this.port}/api/v1`);
          console.log(`🪝 Webhooks:       http://localhost:${this.port}/api/v1/webhooks`);
          resolve();
        });

        server.on('error', (error: Error) => {
          console.error('Server error:', error);
          reject(error);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
          console.log('SIGTERM received, shutting down gracefully');
          server.close(() => {
            console.log('Server closed');
            process.exit(0);
          });
        });

        process.on('SIGINT', () => {
          console.log('SIGINT received, shutting down gracefully');
          server.close(() => {
            console.log('Server closed');
            process.exit(0);
          });
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get Express app instance
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Get server configuration
   */
  public getConfig(): {
    port: number;
    environment: string;
    version: string;
  } {
    return {
      port: this.port,
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    };
  }
}

// Export for use in other files
export default ApiServer;