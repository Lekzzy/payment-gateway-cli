# Discord Integration Guide

This guide covers setting up and using the Discord integration for automatic role management based on billing events.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Discord Bot Setup](#discord-bot-setup)
- [CLI Configuration](#cli-configuration)
- [Role Mapping](#role-mapping)
- [Webhook Listener](#webhook-listener)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [Advanced Configuration](#advanced-configuration)

## 🎯 Overview

The Discord integration automatically manages user roles based on billing events:

- **Grant roles** when invoices are paid
- **Revoke roles** when subscriptions expire or are cancelled
- **Handle refunds** by removing associated roles
- **Support multiple plans** with different role mappings

### Supported Events
- `invoice.paid` → Grant role
- `subscription.expired` → Revoke role
- `subscription.cancelled` → Revoke role
- `refund.completed` → Revoke role

## ✅ Prerequisites

### Discord Requirements
- Discord server (guild) with admin permissions
- Discord application and bot token
- Bot invited to server with proper permissions

### System Requirements
- Node.js 18+ installed
- Billing CLI installed and configured
- Network access for webhook receiving

### Required Permissions
The Discord bot needs these permissions:
- **Manage Roles** - To assign/remove roles
- **View Channels** - To access server information
- **Read Message History** - For bot functionality

## 🤖 Discord Bot Setup

### Step 1: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Enter application name (e.g., "Billing Bot")
4. Click "Create"

### Step 2: Create Bot User

1. Navigate to "Bot" section
2. Click "Add Bot"
3. Configure bot settings:
   - **Username**: Choose a descriptive name
   - **Public Bot**: Disable (recommended)
   - **Requires OAuth2 Code Grant**: Disable
   - **Privileged Gateway Intents**: Enable if needed

### Step 3: Get Bot Token

1. In the "Bot" section, click "Reset Token"
2. Copy the token (keep it secure!)
3. Save token for CLI configuration

### Step 4: Generate Invite Link

1. Go to "OAuth2" → "URL Generator"
2. Select scopes:
   - `bot`
3. Select bot permissions:
   - `Manage Roles`
   - `View Channels`
   - `Read Message History`
4. Copy generated URL
5. Open URL and invite bot to your server

### Step 5: Configure Role Hierarchy

1. In Discord server settings, go to "Roles"
2. Ensure bot's role is **above** roles it will manage
3. Create roles for different billing plans if needed

## ⚙️ CLI Configuration

### Initial Setup

```bash
# Configure Discord integration
npm run dev -- discord config

# Or using built CLI
billing discord config
```

The configuration wizard will prompt for:

#### Bot Token
```
? Enter your Discord bot token: bot_MTIzNDU2Nzg5MDEyMzQ1Njc4.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWx
```

#### Guild ID
```
? Enter your Discord guild (server) ID: 123456789012345678
```

**Finding Guild ID:**
1. Enable Developer Mode in Discord settings
2. Right-click your server name
3. Click "Copy ID"

#### Webhook Secret
```
? Enter webhook secret for verification: whsec_abc123def456ghi789
```

### Configuration File

Settings are stored in `~/.billing/discord.json`:

```json
{
  "botToken": "bot_MTIzNDU2Nzg5MDEyMzQ1Njc4.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWx",
  "guildId": "123456789012345678",
  "webhookSecret": "whsec_abc123def456ghi789",
  "planRoleMappings": {}
}
```

### Test Configuration

```bash
# Test Discord connection
npm run dev -- discord test

# Expected output:
✅ Discord connection successful
✅ Bot permissions verified
📋 Available roles:
   - @everyone (123456789012345678)
   - Premium (234567890123456789)
   - Pro (345678901234567890)
   - Basic (456789012345678901)
```

## 🗺️ Role Mapping

### Map Plans to Roles

```bash
# Interactive role mapping
npm run dev -- discord map

# The CLI will show:
? Select a billing plan:
❯ Basic Plan (plan_basic_123)
  Pro Plan (plan_pro_456)
  Premium Plan (plan_premium_789)

? Select a Discord role:
❯ @Basic
  @Pro
  @Premium
  @Moderator
```

### View Current Mappings

```bash
# List all mappings
npm run dev -- discord mappings

# Output:
📋 Current Plan-Role Mappings:
┌─────────────────┬──────────────────┬─────────────────────┐
│ Plan ID         │ Plan Name        │ Discord Role        │
├─────────────────┼──────────────────┼─────────────────────┤
│ plan_basic_123  │ Basic Plan       │ @Basic              │
│ plan_pro_456    │ Pro Plan         │ @Pro                │
│ plan_premium_789│ Premium Plan     │ @Premium            │
└─────────────────┴──────────────────┴─────────────────────┘

# JSON output
npm run dev -- discord mappings --json
```

### Remove Mappings

```bash
# Remove specific mapping
npm run dev -- discord unmap

# Select mapping to remove:
? Select mapping to remove:
❯ Basic Plan → @Basic
  Pro Plan → @Pro
  Premium Plan → @Premium
```

### Manual Configuration

Edit `~/.billing/discord.json` directly:

```json
{
  "botToken": "bot_...",
  "guildId": "123456789012345678",
  "webhookSecret": "whsec_...",
  "planRoleMappings": {
    "plan_basic_123": {
      "planName": "Basic Plan",
      "roleId": "456789012345678901",
      "roleName": "Basic"
    },
    "plan_pro_456": {
      "planName": "Pro Plan",
      "roleId": "567890123456789012",
      "roleName": "Pro"
    },
    "plan_premium_789": {
      "planName": "Premium Plan",
      "roleId": "678901234567890123",
      "roleName": "Premium"
    }
  }
}
```

## 🎧 Webhook Listener

### Start Webhook Listener

```bash
# Start with default settings (port 3001, path /webhook)
npm run dev -- discord listen

# Custom port and path
npm run dev -- discord listen --port 3002 --path /billing-webhook

# Production mode
npm run discord:listen
```

### Listener Output

```
🚀 Discord webhook listener starting...
📡 Server running on http://localhost:3001
🔗 Webhook endpoint: http://localhost:3001/webhook
🎯 Listening for events: invoice.paid, subscription.expired, refund.completed, subscription.cancelled

📋 Plan-Role Mappings:
   • Basic Plan → @Basic
   • Pro Plan → @Pro
   • Premium Plan → @Premium

✅ Discord bot connected as BillingBot#1234
🎮 Connected to server: My Awesome Server

⏳ Waiting for webhook events...
```

### Webhook Events

When events are received:

```
📨 Webhook received: invoice.paid
🔍 Processing invoice: inv_123456789
👤 Customer: john.doe@example.com
💳 Plan: Pro Plan (plan_pro_456)
🎭 Granting role: @Pro
✅ Role granted successfully

📨 Webhook received: subscription.expired
🔍 Processing subscription: sub_987654321
👤 Customer: jane.smith@example.com
💳 Plan: Premium Plan (plan_premium_789)
🎭 Revoking role: @Premium
✅ Role revoked successfully
```

### Webhook Configuration

Configure your billing system to send webhooks to:
```
http://your-server.com:3001/webhook
```

**Required Headers:**
- `Content-Type: application/json`
- `X-Webhook-Signature: sha256=...` (HMAC signature)
- `X-Webhook-Timestamp: 1234567890` (Unix timestamp)

### Webhook Payload Examples

#### Invoice Paid
```json
{
  "type": "invoice.paid",
  "data": {
    "invoice": {
      "id": "inv_123456789",
      "plan_id": "plan_pro_456",
      "customer": {
        "email": "john.doe@example.com",
        "discord_user_id": "987654321098765432"
      },
      "amount": 2999,
      "currency": "USD",
      "paid_at": "2024-01-15T10:30:00Z"
    }
  },
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Subscription Expired
```json
{
  "type": "subscription.expired",
  "data": {
    "subscription": {
      "id": "sub_987654321",
      "plan_id": "plan_premium_789",
      "customer": {
        "email": "jane.smith@example.com",
        "discord_user_id": "876543210987654321"
      },
      "expired_at": "2024-01-15T10:30:00Z"
    }
  },
  "created_at": "2024-01-15T10:30:00Z"
}
```

## 🧪 Testing

### Test Discord Connection

```bash
# Test bot connection and permissions
npm run dev -- discord test

# Expected output:
✅ Discord connection successful
✅ Bot permissions verified
🎮 Connected to: My Awesome Server (123456789012345678)
🤖 Bot user: BillingBot#1234 (234567890123456789)

📋 Available roles:
   - @everyone (123456789012345678)
   - Premium (678901234567890123)
   - Pro (567890123456789012)
   - Basic (456789012345678901)
   - BillingBot (789012345678901234)

🔒 Bot permissions:
   ✅ Manage Roles
   ✅ View Channels
   ✅ Read Message History
```

### Test Webhook Endpoint

```bash
# Send test webhook (with listener running)
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=test_signature" \
  -H "X-Webhook-Timestamp: $(date +%s)" \
  -d '{
    "type": "invoice.paid",
    "data": {
      "invoice": {
        "id": "inv_test_123",
        "plan_id": "plan_pro_456",
        "customer": {
          "email": "test@example.com",
          "discord_user_id": "123456789012345678"
        }
      }
    }
  }'
```

### Test Role Management

```bash
# Test granting role manually (for development)
node -e "
const { DiscordRoleManager } = require('./dist/discord');
const manager = new DiscordRoleManager();
await manager.connect();
await manager.grantRole('123456789012345678', 'plan_pro_456');
"
```

## 🔧 Troubleshooting

### Common Issues

#### Bot Not Responding
```
❌ Discord connection failed: Invalid token
```

**Solutions:**
1. Verify bot token is correct
2. Check token hasn't been regenerated
3. Ensure bot is invited to server

#### Permission Errors
```
❌ Missing permissions: Manage Roles
```

**Solutions:**
1. Check bot has "Manage Roles" permission
2. Ensure bot role is above target roles
3. Verify bot is in the correct server

#### Role Not Found
```
❌ Role not found: @Premium
```

**Solutions:**
1. Check role exists in server
2. Verify role ID in configuration
3. Ensure role name matches exactly

#### Webhook Verification Failed
```
❌ Webhook verification failed: Invalid signature
```

**Solutions:**
1. Check webhook secret matches
2. Verify timestamp is recent (within 5 minutes)
3. Ensure payload is sent as raw JSON

#### User Not Found
```
⚠️ User not found: 123456789012345678
```

**Solutions:**
1. Verify Discord user ID is correct
2. Check user is in the server
3. Ensure user hasn't left the server

### Debug Mode

Enable debug logging:

```bash
# Enable debug output
DEBUG=billing:discord npm run dev -- discord listen

# Debug output:
billing:discord Connecting to Discord... +0ms
billing:discord Bot connected as BillingBot#1234 +1s
billing:discord Guild found: My Awesome Server +100ms
billing:discord Webhook received: invoice.paid +30s
billing:discord Processing user: 123456789012345678 +1ms
billing:discord Granting role: 567890123456789012 +10ms
billing:discord Role granted successfully +50ms
```

### Log Files

Webhook listener logs are written to:
- **Console**: Real-time output
- **File**: `~/.billing/logs/discord.log` (if configured)

### Health Checks

The webhook listener provides health endpoints:

```bash
# Check listener status
curl http://localhost:3001/health

# Response:
{
  "status": "healthy",
  "discord": {
    "connected": true,
    "guild": "My Awesome Server",
    "bot": "BillingBot#1234"
  },
  "mappings": 3,
  "uptime": 3600
}

# Check Discord status
curl http://localhost:3001/discord/status

# Response:
{
  "connected": true,
  "guild": {
    "id": "123456789012345678",
    "name": "My Awesome Server",
    "memberCount": 150
  },
  "bot": {
    "id": "234567890123456789",
    "username": "BillingBot",
    "discriminator": "1234"
  },
  "permissions": ["MANAGE_ROLES", "VIEW_CHANNEL", "READ_MESSAGE_HISTORY"]
}
```

## 🔒 Security Considerations

### Bot Token Security
- **Never commit** bot tokens to version control
- **Use environment variables** in production
- **Regenerate tokens** if compromised
- **Limit bot permissions** to minimum required

### Webhook Security
- **Always verify** webhook signatures
- **Check timestamps** to prevent replay attacks
- **Use HTTPS** in production
- **Rotate webhook secrets** regularly

### Role Management
- **Principle of least privilege** - only grant necessary roles
- **Audit role changes** regularly
- **Monitor for unauthorized** role modifications
- **Backup role configurations**

### Network Security
- **Firewall webhook endpoints** appropriately
- **Use reverse proxy** for SSL termination
- **Rate limit** webhook endpoints
- **Monitor for abuse**

## ⚙️ Advanced Configuration

### Environment Variables

```bash
# Production configuration
export DISCORD_BOT_TOKEN="bot_..."
export DISCORD_GUILD_ID="123456789012345678"
export DISCORD_WEBHOOK_SECRET="whsec_..."
export DISCORD_WEBHOOK_PORT="3001"
export DISCORD_WEBHOOK_PATH="/webhook"
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY docs/ ./docs/

EXPOSE 3001

CMD ["npm", "run", "discord:listen"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  discord-webhook:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
      - DISCORD_GUILD_ID=${DISCORD_GUILD_ID}
      - DISCORD_WEBHOOK_SECRET=${DISCORD_WEBHOOK_SECRET}
    restart: unless-stopped
    volumes:
      - ./config:/root/.billing
```

### Process Management

```bash
# Using PM2
npm install -g pm2

# Start webhook listener
pm2 start npm --name "discord-webhook" -- run discord:listen

# Monitor
pm2 status
pm2 logs discord-webhook

# Auto-restart on file changes
pm2 start npm --name "discord-webhook" --watch -- run discord:listen
```

### Load Balancing

For high-availability setups:

```nginx
# nginx.conf
upstream discord_webhook {
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}

server {
    listen 80;
    server_name webhook.example.com;

    location /webhook {
        proxy_pass http://discord_webhook;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Monitoring

```bash
# Health check script
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
if [ $response -eq 200 ]; then
    echo "✅ Discord webhook listener is healthy"
else
    echo "❌ Discord webhook listener is unhealthy (HTTP $response)"
    # Restart service or send alert
fi
```

### Custom Event Handlers

Extend the webhook listener for custom events:

```typescript
// custom-handler.ts
import { DiscordWebhookListener } from './src/discord';

class CustomDiscordListener extends DiscordWebhookListener {
  protected async handleCustomEvent(event: any): Promise<void> {
    // Custom event handling logic
    console.log('Custom event received:', event.type);
  }
}

const listener = new CustomDiscordListener();
listener.start(3001, '/webhook');
```

---

For more advanced use cases and examples, see the [Examples Documentation](./examples.md).