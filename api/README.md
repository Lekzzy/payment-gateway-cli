# Crypto Subscription API

Node.js REST API for managing crypto subscription plans and processing payments on blockchain networks.

## Features

- **Plan Management**: Create, update, pause/unpause subscription plans
- **Subscription Management**: Subscribe, cancel, pause/resume subscriptions
- **Payment Processing**: Process regular charges and signed quote payments
- **Refund Processing**: Issue refunds for subscriptions
- **Health Monitoring**: Comprehensive health checks and monitoring
- **API Documentation**: Swagger/OpenAPI documentation
- **Security**: Rate limiting, CORS, helmet security headers
- **Logging**: Structured logging with Winston

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Deployed smart contracts
- Private key with testnet/mainnet funds

### Installation

```bash
cd api
npm install
npm run setup
```

### Configuration

1. Copy environment file:
```bash
cp env.example .env
```

2. Update `.env` with your configuration:
```bash
# Server
PORT=3000
NODE_ENV=development

# Blockchain
RPC_URL=https://rpc-amoy.polygon.technology
AMOY_PRIVATE_KEY=your_private_key_here

# Contracts (will be auto-loaded from deployments/)
```

### Running the API

```bash
# Development mode (with hot reload)
npm run dev

# Build TypeScript
npm run build

# Production mode
npm start
```

## API Endpoints

### Plans
- `GET /api/plans/merchant/:address` - Get all plans for a merchant
- `GET /api/plans/:id` - Get plan by ID
- `POST /api/plans` - Create new plan
- `PUT /api/plans/:id` - Update plan
- `POST /api/plans/:id/pause` - Pause plan
- `POST /api/plans/:id/unpause` - Unpause plan

### Subscriptions
- `GET /api/subscriptions/:id` - Get subscription by ID
- `GET /api/subscriptions/subscriber/:address` - Get subscriptions for subscriber
- `GET /api/subscriptions/merchant/:address` - Get subscriptions for merchant
- `POST /api/subscriptions` - Create subscription
- `POST /api/subscriptions/:id/cancel` - Cancel subscription
- `POST /api/subscriptions/:id/pause` - Pause subscription
- `POST /api/subscriptions/:id/resume` - Resume subscription

### Charges
- `POST /api/charges/process/:subscriptionId` - Process regular charge
- `POST /api/charges/process-quote` - Process charge with signed quote
- `POST /api/charges/refund` - Issue refund
- `POST /api/charges/calculate-token-amount` - Calculate token amount for USD price
- `POST /api/charges/generate-quote-signature` - Generate signature for quote

### Health
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health check with contract status

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:3000/api-docs`
- Health Check: `http://localhost:3000/health`

## Example Usage

### Create a Plan
```bash
curl -X POST http://localhost:3000/api/plans \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Monthly",
    "priceInCents": 1999,
    "currency": "USD",
    "billingIntervalSeconds": 2592000,
    "allowedTokens": ["0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"]
  }'
```

### Create a Subscription
```bash
curl -X POST http://localhost:3000/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "planId": 1,
    "payerToken": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
  }'
```

### Process a Charge
```bash
curl -X POST http://localhost:3000/api/charges/process/1
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Security

- Rate limiting: 100 requests per 15 minutes per IP
- CORS enabled with configurable origins
- Helmet security headers
- Input validation with express-validator
- Private key protection (never logged)

## Logging

Logs are written to:
- `logs/error.log` - Error level logs
- `logs/combined.log` - All logs
- Console output in development

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Deployment

1. Set `NODE_ENV=production`
2. Configure production RPC URLs
3. Set up proper logging
4. Use process manager (PM2, Docker, etc.)

## Contributing

1. Follow existing code style
2. Add tests for new features
3. Update API documentation
4. Ensure all tests pass

## License

MIT
