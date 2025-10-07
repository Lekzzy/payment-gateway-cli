# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Billing System CLI, SDK, and services.

## 📋 Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [CLI Issues](#cli-issues)
- [SDK Issues](#sdk-issues)
- [API Server Issues](#api-server-issues)
- [Discord Integration Issues](#discord-integration-issues)
- [Webhook Issues](#webhook-issues)
- [Network and Connectivity](#network-and-connectivity)
- [Performance Issues](#performance-issues)
- [Security Issues](#security-issues)
- [Deployment Issues](#deployment-issues)
- [Logging and Debugging](#logging-and-debugging)

## 🔍 Quick Diagnostics

### Health Check Commands

```bash
# Check CLI installation
billing --version
billing --help

# Test API connectivity
billing plan list --debug

# Test Discord connection
billing discord test

# Check webhook configuration
billing webhook verify

# View configuration
billing config show
```

### System Information

```bash
# Node.js version
node --version
npm --version

# System resources
free -h  # Linux/macOS
wmic OS get TotalVisibleMemorySize /value  # Windows

# Network connectivity
ping api.billing.example.com
curl -I https://discord.com/api/v10/gateway
```

## 💻 CLI Issues

### Installation Problems

#### Issue: `npm install -g` fails with permission errors

**Symptoms:**
```
EACCES: permission denied, mkdir '/usr/local/lib/node_modules'
```

**Solutions:**

1. **Use Node Version Manager (Recommended)**
   ```bash
   # Install nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Install and use Node.js
   nvm install 18
   nvm use 18
   
   # Install CLI
   npm install -g billing-cli
   ```

2. **Configure npm prefix**
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Use sudo (Not recommended)**
   ```bash
   sudo npm install -g billing-cli
   ```

#### Issue: Command not found after installation

**Symptoms:**
```bash
billing: command not found
```

**Solutions:**

1. **Check PATH**
   ```bash
   echo $PATH
   which billing
   npm list -g --depth=0
   ```

2. **Reinstall with correct prefix**
   ```bash
   npm uninstall -g billing-cli
   npm install -g billing-cli
   ```

3. **Create symlink manually**
   ```bash
   ln -s /usr/local/lib/node_modules/billing-cli/dist/cli/index.js /usr/local/bin/billing
   chmod +x /usr/local/bin/billing
   ```

### Configuration Issues

#### Issue: API key not working

**Symptoms:**
```
Error: Unauthorized (401)
Invalid API key provided
```

**Solutions:**

1. **Verify API key format**
   ```bash
   # Test API keys should start with 'test_'
   # Live API keys should start with 'live_'
   billing config show
   ```

2. **Reconfigure API key**
   ```bash
   billing init
   # Or manually edit ~/.billing/config.json
   ```

3. **Check environment variables**
   ```bash
   echo $BILLING_API_KEY
   unset BILLING_API_KEY  # If conflicting
   ```

#### Issue: Configuration file corruption

**Symptoms:**
```
Error: Invalid configuration file
SyntaxError: Unexpected token in JSON
```

**Solutions:**

1. **Reset configuration**
   ```bash
   rm ~/.billing/config.json
   billing init
   ```

2. **Validate JSON manually**
   ```bash
   cat ~/.billing/config.json | jq .
   ```

3. **Restore from backup**
   ```bash
   cp ~/.billing/config.json.backup ~/.billing/config.json
   ```

### Command Execution Issues

#### Issue: Timeout errors

**Symptoms:**
```
Error: Request timeout after 30000ms
```

**Solutions:**

1. **Increase timeout**
   ```bash
   billing plan list --timeout 60000
   ```

2. **Check network connectivity**
   ```bash
   curl -w "@curl-format.txt" -o /dev/null -s "https://api.billing.example.com/health"
   ```

3. **Use debug mode**
   ```bash
   billing plan list --debug
   ```

## 🔧 SDK Issues

### Import/Require Issues

#### Issue: Module not found

**Symptoms:**
```typescript
Error: Cannot find module 'billing-sdk'
```

**Solutions:**

1. **Install SDK**
   ```bash
   npm install billing-sdk
   ```

2. **Check import syntax**
   ```typescript
   // ES6 modules
   import { BillingClient } from 'billing-sdk';
   
   // CommonJS
   const { BillingClient } = require('billing-sdk');
   ```

3. **Verify package.json**
   ```json
   {
     "dependencies": {
       "billing-sdk": "^1.0.0"
     }
   }
   ```

### TypeScript Issues

#### Issue: Type definitions not found

**Symptoms:**
```
Could not find a declaration file for module 'billing-sdk'
```

**Solutions:**

1. **Install types**
   ```bash
   npm install @types/billing-sdk
   ```

2. **Add type declaration**
   ```typescript
   // types/billing-sdk.d.ts
   declare module 'billing-sdk' {
     export class BillingClient {
       constructor(config: any);
       plans: any;
       invoices: any;
       refunds: any;
       webhooks: any;
     }
   }
   ```

### Authentication Issues

#### Issue: SDK authentication failures

**Symptoms:**
```typescript
BillingError: Authentication failed
```

**Solutions:**

1. **Verify configuration**
   ```typescript
   const client = new BillingClient({
     apiKey: process.env.BILLING_API_KEY,
     baseUrl: 'https://api.billing.example.com',
     debug: true
   });
   ```

2. **Check environment variables**
   ```bash
   echo $BILLING_API_KEY
   ```

3. **Test with curl**
   ```bash
   curl -H "Authorization: Bearer $BILLING_API_KEY" \
        https://api.billing.example.com/plans
   ```

## 🌐 API Server Issues

### Server Startup Issues

#### Issue: Port already in use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

1. **Find and kill process**
   ```bash
   # Linux/macOS
   lsof -ti:3000 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. **Use different port**
   ```bash
   API_PORT=3001 npm run api:start
   ```

3. **Check for zombie processes**
   ```bash
   ps aux | grep node
   pkill -f "node.*api"
   ```

#### Issue: Module resolution errors

**Symptoms:**
```
Error: Cannot find module './dist/api/index.js'
```

**Solutions:**

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Check build output**
   ```bash
   ls -la dist/api/
   ```

3. **Clean and rebuild**
   ```bash
   npm run clean
   npm run build
   ```

### Runtime Issues

#### Issue: Memory leaks

**Symptoms:**
- Increasing memory usage over time
- Process crashes with "out of memory"

**Solutions:**

1. **Monitor memory usage**
   ```bash
   # Add to your application
   setInterval(() => {
     const usage = process.memoryUsage();
     console.log('Memory usage:', {
       rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
       heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
       heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB'
     });
   }, 30000);
   ```

2. **Use heap profiling**
   ```bash
   node --inspect dist/api/index.js
   # Connect Chrome DevTools to chrome://inspect
   ```

3. **Implement proper cleanup**
   ```typescript
   process.on('SIGTERM', () => {
     server.close(() => {
       // Cleanup resources
       process.exit(0);
     });
   });
   ```

## 🎮 Discord Integration Issues

### Bot Setup Issues

#### Issue: Invalid bot token

**Symptoms:**
```
Error: Invalid token provided
```

**Solutions:**

1. **Verify token format**
   ```bash
   # Bot tokens should start with a long string of characters
   echo $DISCORD_BOT_TOKEN | wc -c  # Should be ~70 characters
   ```

2. **Regenerate token**
   - Go to Discord Developer Portal
   - Select your application
   - Go to Bot section
   - Click "Reset Token"

3. **Check token permissions**
   - Ensure bot has "Manage Roles" permission
   - Bot role must be higher than roles it manages

#### Issue: Bot not in guild

**Symptoms:**
```
Error: Unknown Guild
```

**Solutions:**

1. **Verify guild ID**
   ```bash
   billing discord config
   # Enter correct guild ID
   ```

2. **Re-invite bot**
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=268435456&scope=bot
   ```

3. **Check bot permissions**
   - Bot must have "Manage Roles" permission
   - Bot must be in the specified guild

### Role Management Issues

#### Issue: Cannot assign roles

**Symptoms:**
```
Error: Missing Permissions
```

**Solutions:**

1. **Check role hierarchy**
   ```bash
   billing discord test
   # Shows bot's highest role and available roles
   ```

2. **Move bot role higher**
   - In Discord server settings
   - Drag bot role above roles it needs to manage

3. **Verify permissions**
   ```typescript
   // Check if bot can manage specific role
   const botMember = guild.members.cache.get(client.user.id);
   const canManage = botMember.permissions.has('MANAGE_ROLES');
   ```

### Webhook Issues

#### Issue: Webhook signature verification fails

**Symptoms:**
```
Error: Invalid webhook signature
```

**Solutions:**

1. **Verify webhook secret**
   ```bash
   billing discord config
   # Ensure webhook secret matches billing system
   ```

2. **Check request headers**
   ```typescript
   console.log('Headers:', req.headers);
   console.log('Signature:', req.headers['x-signature-256']);
   ```

3. **Debug signature calculation**
   ```typescript
   const crypto = require('crypto');
   const signature = crypto
     .createHmac('sha256', webhookSecret)
     .update(req.body, 'utf8')
     .digest('hex');
   console.log('Expected:', signature);
   console.log('Received:', req.headers['x-signature-256']);
   ```

## 🔗 Webhook Issues

### Delivery Issues

#### Issue: Webhooks not being received

**Symptoms:**
- No webhook events in logs
- Billing events not triggering Discord actions

**Solutions:**

1. **Check webhook URL**
   ```bash
   curl -X POST https://yourdomain.com/webhook \
        -H "Content-Type: application/json" \
        -d '{"test": true}'
   ```

2. **Verify firewall settings**
   ```bash
   # Check if port is open
   nmap -p 3001 yourdomain.com
   ```

3. **Test with ngrok (development)**
   ```bash
   ngrok http 3001
   # Use ngrok URL for webhook endpoint
   ```

#### Issue: Webhook signature verification

**Symptoms:**
```
Error: Webhook signature verification failed
```

**Solutions:**

1. **Check webhook secret**
   ```bash
   # Ensure secret matches between billing system and your app
   echo $BILLING_WEBHOOK_SECRET
   ```

2. **Verify signature calculation**
   ```typescript
   import crypto from 'crypto';
   
   function verifySignature(payload: string, signature: string, secret: string): boolean {
     const expectedSignature = crypto
       .createHmac('sha256', secret)
       .update(payload, 'utf8')
       .digest('hex');
     
     return crypto.timingSafeEqual(
       Buffer.from(signature, 'hex'),
       Buffer.from(expectedSignature, 'hex')
     );
   }
   ```

3. **Debug raw payload**
   ```typescript
   app.use('/webhook', express.raw({ type: 'application/json' }));
   app.post('/webhook', (req, res) => {
     console.log('Raw body:', req.body.toString());
     console.log('Signature:', req.headers['x-signature-256']);
   });
   ```

### Processing Issues

#### Issue: Webhook events not processing

**Symptoms:**
- Webhooks received but no actions taken
- Errors in webhook processing

**Solutions:**

1. **Check event type handling**
   ```typescript
   app.post('/webhook', (req, res) => {
     const event = req.body;
     console.log('Event type:', event.type);
     
     switch (event.type) {
       case 'invoice.paid':
         // Handle payment
         break;
       case 'subscription.cancelled':
         // Handle cancellation
         break;
       default:
         console.log('Unhandled event type:', event.type);
     }
   });
   ```

2. **Add error handling**
   ```typescript
   app.post('/webhook', async (req, res) => {
     try {
       await processWebhook(req.body);
       res.status(200).send('OK');
     } catch (error) {
       console.error('Webhook processing error:', error);
       res.status(500).send('Error processing webhook');
     }
   });
   ```

3. **Implement retry logic**
   ```typescript
   async function processWebhookWithRetry(event: any, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         await processWebhook(event);
         return;
       } catch (error) {
         console.log(`Retry ${i + 1}/${maxRetries}:`, error.message);
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
       }
     }
   }
   ```

## 🌐 Network and Connectivity

### DNS Issues

#### Issue: Cannot resolve API hostname

**Symptoms:**
```
Error: getaddrinfo ENOTFOUND api.billing.example.com
```

**Solutions:**

1. **Check DNS resolution**
   ```bash
   nslookup api.billing.example.com
   dig api.billing.example.com
   ```

2. **Use IP address temporarily**
   ```bash
   # Find IP address
   ping api.billing.example.com
   
   # Use in configuration
   billing config set baseUrl http://192.168.1.100:3000
   ```

3. **Check /etc/hosts file**
   ```bash
   cat /etc/hosts
   # Add entry if needed:
   # 192.168.1.100 api.billing.example.com
   ```

### SSL/TLS Issues

#### Issue: SSL certificate errors

**Symptoms:**
```
Error: unable to verify the first certificate
Error: certificate has expired
```

**Solutions:**

1. **Check certificate validity**
   ```bash
   openssl s_client -connect api.billing.example.com:443 -servername api.billing.example.com
   ```

2. **Disable SSL verification (development only)**
   ```bash
   NODE_TLS_REJECT_UNAUTHORIZED=0 billing plan list
   ```

3. **Update certificate bundle**
   ```bash
   # Update system certificates
   sudo apt update && sudo apt install ca-certificates
   ```

### Proxy Issues

#### Issue: Requests failing behind corporate proxy

**Symptoms:**
```
Error: connect ECONNREFUSED 192.168.1.1:8080
```

**Solutions:**

1. **Configure proxy**
   ```bash
   export HTTP_PROXY=http://proxy.company.com:8080
   export HTTPS_PROXY=http://proxy.company.com:8080
   export NO_PROXY=localhost,127.0.0.1
   ```

2. **Configure npm proxy**
   ```bash
   npm config set proxy http://proxy.company.com:8080
   npm config set https-proxy http://proxy.company.com:8080
   ```

3. **Use proxy in SDK**
   ```typescript
   const client = new BillingClient({
     apiKey: 'your-key',
     proxy: {
       host: 'proxy.company.com',
       port: 8080
     }
   });
   ```

## ⚡ Performance Issues

### Slow API Responses

#### Issue: High response times

**Symptoms:**
- API calls taking > 5 seconds
- Timeout errors

**Solutions:**

1. **Enable request timing**
   ```typescript
   const start = Date.now();
   const response = await client.plans.list();
   console.log(`Request took ${Date.now() - start}ms`);
   ```

2. **Use pagination**
   ```typescript
   // Instead of fetching all records
   const allPlans = await client.plans.list();
   
   // Fetch in smaller chunks
   const plans = await client.plans.list({ limit: 10, offset: 0 });
   ```

3. **Implement caching**
   ```typescript
   const cache = new Map();
   
   async function getCachedPlans() {
     if (cache.has('plans')) {
       return cache.get('plans');
     }
     
     const plans = await client.plans.list();
     cache.set('plans', plans);
     setTimeout(() => cache.delete('plans'), 300000); // 5 min cache
     
     return plans;
   }
   ```

### Memory Usage

#### Issue: High memory consumption

**Solutions:**

1. **Monitor memory usage**
   ```typescript
   setInterval(() => {
     const usage = process.memoryUsage();
     if (usage.heapUsed > 100 * 1024 * 1024) { // 100MB
       console.warn('High memory usage:', usage);
     }
   }, 30000);
   ```

2. **Implement streaming for large datasets**
   ```typescript
   async function* streamPlans() {
     let offset = 0;
     const limit = 100;
     
     while (true) {
       const plans = await client.plans.list({ limit, offset });
       if (plans.data.length === 0) break;
       
       for (const plan of plans.data) {
         yield plan;
       }
       
       offset += limit;
     }
   }
   ```

## 🔒 Security Issues

### API Key Exposure

#### Issue: API key leaked in logs/code

**Symptoms:**
- API key visible in application logs
- API key committed to version control

**Solutions:**

1. **Rotate API key immediately**
   ```bash
   # Generate new API key in billing dashboard
   billing config set apiKey new_api_key_here
   ```

2. **Clean git history**
   ```bash
   # Remove from git history
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch config.json' \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Use environment variables**
   ```bash
   # Never hardcode API keys
   export BILLING_API_KEY=your_api_key
   ```

### Webhook Security

#### Issue: Webhook endpoint accessible without verification

**Solutions:**

1. **Always verify signatures**
   ```typescript
   app.post('/webhook', (req, res) => {
     const signature = req.headers['x-signature-256'];
     if (!verifySignature(req.body, signature, webhookSecret)) {
       return res.status(401).send('Unauthorized');
     }
     // Process webhook
   });
   ```

2. **Use HTTPS only**
   ```nginx
   # Redirect HTTP to HTTPS
   server {
     listen 80;
     return 301 https://$server_name$request_uri;
   }
   ```

3. **Implement rate limiting**
   ```typescript
   import rateLimit from 'express-rate-limit';
   
   const webhookLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   
   app.use('/webhook', webhookLimiter);
   ```

## 🚀 Deployment Issues

### Docker Issues

#### Issue: Container fails to start

**Symptoms:**
```
Error: Cannot find module './dist/api/index.js'
```

**Solutions:**

1. **Check Dockerfile build**
   ```dockerfile
   # Ensure build step is included
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   
   FROM node:18-alpine AS production
   WORKDIR /app
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/package*.json ./
   RUN npm ci --only=production
   ```

2. **Debug container**
   ```bash
   # Run container interactively
   docker run -it --entrypoint /bin/sh your-image
   
   # Check file structure
   ls -la dist/
   ```

3. **Check build logs**
   ```bash
   docker build --no-cache -t your-image .
   ```

### Process Management

#### Issue: Process crashes in production

**Solutions:**

1. **Use PM2 for process management**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 startup
   pm2 save
   ```

2. **Configure restart policies**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'billing-api',
       script: 'dist/api/index.js',
       instances: 'max',
       exec_mode: 'cluster',
       max_restarts: 10,
       min_uptime: '10s',
       max_memory_restart: '1G'
     }]
   };
   ```

3. **Implement graceful shutdown**
   ```typescript
   process.on('SIGTERM', () => {
     console.log('SIGTERM received, shutting down gracefully');
     server.close(() => {
       process.exit(0);
     });
   });
   ```

## 📊 Logging and Debugging

### Enable Debug Logging

```bash
# CLI debug mode
billing plan list --debug

# Environment variable
DEBUG=billing:* npm start

# Application debug
NODE_ENV=development npm start
```

### Structured Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'debug.log' })
  ]
});

// Use in application
logger.info('Processing webhook', { eventType: 'invoice.paid', invoiceId: 'inv_123' });
logger.error('Failed to process webhook', { error: error.message, stack: error.stack });
```

### Request Tracing

```typescript
import { v4 as uuidv4 } from 'uuid';

app.use((req, res, next) => {
  req.id = uuidv4();
  console.log(`[${req.id}] ${req.method} ${req.path}`);
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.id}] ${res.statusCode} ${duration}ms`);
  });
  next();
});
```

---

## 🆘 Getting Help

If you're still experiencing issues after following this guide:

1. **Check the logs** with debug mode enabled
2. **Search existing issues** in the project issue tracker
3. **Create a new support ticket** with:
   - Detailed error messages
   - Steps to reproduce
   - Environment information
   - Debug logs
4. **Join our Discord** for community support
5. **Contact support** for enterprise customers

Remember to **never share API keys or sensitive information** when asking for help!