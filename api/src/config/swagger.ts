import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Crypto Subscription API',
      version: '1.0.0',
      description: 'API for managing crypto subscription plans and processing payments',
      contact: {
        name: 'Your Name',
        email: 'your.email@example.com'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Plan: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '1' },
            merchant: { type: 'string', example: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6' },
            name: { type: 'string', example: 'Premium Monthly' },
            priceInCents: { type: 'string', example: '1999' },
            currency: { type: 'string', example: 'USD' },
            billingIntervalSeconds: { type: 'string', example: '2592000' },
            allowedTokens: {
              type: 'array',
              items: { type: 'string' },
              example: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6']
            },
            active: { type: 'boolean', example: true }
          }
        },
        Subscription: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '1' },
            planId: { type: 'string', example: '1' },
            subscriber: { type: 'string', example: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6' },
            payerToken: { type: 'string', example: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6' },
            status: { type: 'number', example: 0 },
            nextBilling: { type: 'string', example: '1640995200' },
            createdAt: { type: 'string', example: '1640908800' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            error: { type: 'string', example: 'Detailed error description' }
          }
        }
      }
    },
    tags: [
      {
        name: 'Plans',
        description: 'Plan management endpoints'
      },
      {
        name: 'Subscriptions',
        description: 'Subscription management endpoints'
      },
      {
        name: 'Charges',
        description: 'Payment processing endpoints'
      },
      {
        name: 'Health',
        description: 'Health check endpoints'
      }
    ]
  },
  apis: ['./src/routes/*.ts']
};

const specs = swaggerJSDoc(options);

export default specs;
