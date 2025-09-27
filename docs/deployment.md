# Deployment Guide

This guide covers deploying the Billing System CLI, SDK, and services in various environments.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [CLI Deployment](#cli-deployment)
- [API Server Deployment](#api-server-deployment)
- [Discord Service Deployment](#discord-service-deployment)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security Considerations](#security-considerations)
- [Backup and Recovery](#backup-and-recovery)

## 🎯 Overview

The billing system consists of several deployable components:

- **CLI Tool**: Command-line interface for billing operations
- **API Server**: RESTful API for billing operations
- **Discord Service**: Webhook listener for Discord role management
- **Test API**: Mock API server for development and testing
- **Node.js SDK**: Client library for integration

## ✅ Prerequisites

### System Requirements
- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Operating System**: Linux, macOS, or Windows
- **Memory**: Minimum 512MB RAM
- **Storage**: 1GB available space

### Network Requirements
- **Outbound HTTPS**: For API communication
- **Inbound HTTP/HTTPS**: For webhook endpoints
- **Discord API Access**: For Discord integration
- **Port Access**: Configurable ports for services

### Dependencies
- **TypeScript**: For compilation
- **PM2**: For process management (recommended)
- **Nginx**: For reverse proxy (optional)
- **SSL Certificate**: For HTTPS in production

## ⚙️ Environment Configuration

### Environment Variables

Create a `.env` file for production configuration:

```bash
# API Configuration
BILLING_API_KEY=live_your_production_api_key
BILLING_API_URL=https://api.billing.example.com
BILLING_WEBHOOK_SECRET=whsec_your_webhook_secret

# Discord Configuration
DISCORD_BOT_TOKEN=bot_your_discord_bot_token
DISCORD_GUILD_ID=your_discord_guild_id
DISCORD_WEBHOOK_SECRET=whsec_your_discord_webhook_secret

# Server Configuration
API_PORT=3000
DISCORD_WEBHOOK_PORT=3001
WEBHOOK_PATH=/webhook

# Security
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/billing/app.log

# Database (if applicable)
DATABASE_URL=postgresql://user:pass@localhost:5432/billing
REDIS_URL=redis://localhost:6379
```

### Configuration Files

#### Production Config (`~/.billing/config.json`)
```json
{
  "apiKey": "live_your_production_api_key",
  "baseUrl": "https://api.billing.example.com",
  "timeout": 30000,
  "retries": 3,
  "debug": false,
  "environment": "production"
}
```

#### Discord Config (`~/.billing/discord.json`)
```json
{
  "botToken": "bot_your_discord_bot_token",
  "guildId": "your_discord_guild_id",
  "webhookSecret": "whsec_your_discord_webhook_secret",
  "planRoleMappings": {
    "plan_basic": {
      "planName": "Basic Plan",
      "roleId": "role_id_basic",
      "roleName": "Basic"
    },
    "plan_pro": {
      "planName": "Pro Plan",
      "roleId": "role_id_pro",
      "roleName": "Pro"
    }
  }
}
```

## 💻 CLI Deployment

### Global Installation

```bash
# Build the project
npm run build

# Install globally
npm install -g .

# Or link for development
npm link

# Verify installation
billing --version
billing --help
```

### System-wide Installation

```bash
# Create system user
sudo useradd -r -s /bin/false billing

# Install to system directory
sudo mkdir -p /opt/billing
sudo cp -r dist/* /opt/billing/
sudo chown -R billing:billing /opt/billing

# Create symlink
sudo ln -s /opt/billing/cli/index.js /usr/local/bin/billing
sudo chmod +x /usr/local/bin/billing
```

### Configuration Setup

```bash
# Initialize configuration
billing init

# Configure Discord (if needed)
billing discord config

# Test configuration
billing plan list
billing discord test
```

## 🌐 API Server Deployment

### Basic Deployment

```bash
# Build the project
npm run build

# Start API server
npm run api:start

# Or with PM2
pm2 start npm --name "billing-api" -- run api:start
```

### Production Deployment

#### 1. Prepare Application

```bash
# Create application directory
sudo mkdir -p /opt/billing-api
cd /opt/billing-api

# Copy built application
sudo cp -r /path/to/your/project/dist ./
sudo cp package.json ./
sudo cp package-lock.json ./

# Install production dependencies
sudo npm ci --only=production

# Set ownership
sudo chown -R billing:billing /opt/billing-api
```

#### 2. Create Systemd Service

```bash
# Create service file
sudo tee /etc/systemd/system/billing-api.service << EOF
[Unit]
Description=Billing API Server
After=network.target

[Service]
Type=simple
User=billing
Group=billing
WorkingDirectory=/opt/billing-api
ExecStart=/usr/bin/node dist/api/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=API_PORT=3000
EnvironmentFile=/opt/billing-api/.env

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable billing-api
sudo systemctl start billing-api
sudo systemctl status billing-api
```

#### 3. Configure Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/billing-api
server {
    listen 80;
    server_name api.billing.example.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.billing.example.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.billing.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.billing.example.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/billing-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🎮 Discord Service Deployment

### Basic Deployment

```bash
# Start Discord webhook listener
npm run discord:listen

# Or with PM2
pm2 start npm --name "discord-webhook" -- run discord:listen
```

### Production Deployment

#### 1. Create Systemd Service

```bash
sudo tee /etc/systemd/system/discord-webhook.service << EOF
[Unit]
Description=Discord Webhook Listener
After=network.target

[Service]
Type=simple
User=billing
Group=billing
WorkingDirectory=/opt/billing-api
ExecStart=/usr/bin/node dist/discord/webhook-listener.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=DISCORD_WEBHOOK_PORT=3001
EnvironmentFile=/opt/billing-api/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable discord-webhook
sudo systemctl start discord-webhook
```

#### 2. Configure Nginx for Webhooks

```nginx
# Add to existing server block or create new one
location /discord/webhook {
    limit_req zone=webhook burst=10 nodelay;
    
    proxy_pass http://localhost:3001/webhook;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Preserve raw body for webhook verification
    proxy_set_header Content-Type $content_type;
    proxy_set_header Content-Length $content_length;
    proxy_request_buffering off;
}
```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S billing && \
    adduser -S billing -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/docs ./docs

# Install production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Set ownership
RUN chown -R billing:billing /app
USER billing

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

EXPOSE 3000 3001

# Default command
CMD ["node", "dist/api/index.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  billing-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - API_PORT=3000
      - BILLING_API_KEY=${BILLING_API_KEY}
      - BILLING_API_URL=${BILLING_API_URL}
    volumes:
      - ./config:/app/config:ro
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - billing-network

  discord-webhook:
    build: .
    command: ["node", "dist/discord/webhook-listener.js"]
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DISCORD_WEBHOOK_PORT=3001
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
      - DISCORD_GUILD_ID=${DISCORD_GUILD_ID}
      - DISCORD_WEBHOOK_SECRET=${DISCORD_WEBHOOK_SECRET}
    volumes:
      - ./config:/app/config:ro
      - ./logs:/app/logs
    restart: unless-stopped
    depends_on:
      - billing-api
    networks:
      - billing-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - billing-api
      - discord-webhook
    restart: unless-stopped
    networks:
      - billing-network

networks:
  billing-network:
    driver: bridge

volumes:
  logs:
  config:
```

### Docker Deployment Commands

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f billing-api
docker-compose logs -f discord-webhook

# Scale services
docker-compose up -d --scale billing-api=3

# Update services
docker-compose pull
docker-compose up -d

# Backup configuration
docker run --rm -v billing_config:/data -v $(pwd):/backup alpine tar czf /backup/config-backup.tar.gz -C /data .
```

## ☁️ Cloud Deployment

### AWS Deployment

#### 1. EC2 Instance Setup

```bash
# Launch EC2 instance (Ubuntu 22.04 LTS)
# Security groups: HTTP (80), HTTPS (443), SSH (22), Custom (3000-3001)

# Connect and setup
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx

# Setup application
git clone your-repo
cd billing-system
npm install
npm run build
```

#### 2. Application Load Balancer

```yaml
# ALB configuration (CloudFormation/Terraform)
Resources:
  BillingALB:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Type: application
      Scheme: internet-facing
      SecurityGroups:
        - !Ref ALBSecurityGroup
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2

  BillingTargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Port: 3000
      Protocol: HTTP
      VpcId: !Ref VPC
      HealthCheckPath: /health
      HealthCheckIntervalSeconds: 30
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 5
```

#### 3. Auto Scaling Group

```yaml
BillingLaunchTemplate:
  Type: AWS::EC2::LaunchTemplate
  Properties:
    LaunchTemplateData:
      ImageId: ami-0c02fb55956c7d316  # Ubuntu 22.04 LTS
      InstanceType: t3.micro
      SecurityGroupIds:
        - !Ref InstanceSecurityGroup
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          # Install and configure application
          curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
          apt-get install -y nodejs git
          npm install -g pm2
          
          # Clone and setup application
          cd /opt
          git clone ${RepositoryURL}
          cd billing-system
          npm install
          npm run build
          
          # Start services
          pm2 start ecosystem.config.js
          pm2 startup
          pm2 save
```

### Google Cloud Platform

#### 1. Cloud Run Deployment

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/billing-api', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/billing-api']
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'billing-api'
      - '--image'
      - 'gcr.io/$PROJECT_ID/billing-api'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
```

#### 2. Kubernetes Deployment

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: billing-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: billing-api
  template:
    metadata:
      labels:
        app: billing-api
    spec:
      containers:
      - name: billing-api
        image: gcr.io/your-project/billing-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: BILLING_API_KEY
          valueFrom:
            secretKeyRef:
              name: billing-secrets
              key: api-key
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: billing-api-service
spec:
  selector:
    app: billing-api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-billing-app

# Configure environment variables
heroku config:set NODE_ENV=production
heroku config:set BILLING_API_KEY=your_api_key
heroku config:set DISCORD_BOT_TOKEN=your_bot_token

# Deploy
git push heroku main

# Scale dynos
heroku ps:scale web=2 worker=1

# View logs
heroku logs --tail
```

#### Procfile

```
web: node dist/api/index.js
worker: node dist/discord/webhook-listener.js
```

## 📊 Monitoring and Logging

### Application Monitoring

#### 1. Health Checks

```typescript
// health-check.ts
import express from 'express';
import { BillingClient } from './sdk';

const app = express();

app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {}
  };

  try {
    // Check billing API
    const client = new BillingClient({ apiKey: process.env.BILLING_API_KEY! });
    await client.plans.list({ limit: 1 });
    health.services.billing_api = 'healthy';
  } catch (error) {
    health.services.billing_api = 'unhealthy';
    health.status = 'degraded';
  }

  // Check Discord connection
  try {
    // Discord health check logic
    health.services.discord = 'healthy';
  } catch (error) {
    health.services.discord = 'unhealthy';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

#### 2. Prometheus Metrics

```typescript
// metrics.ts
import promClient from 'prom-client';

// Create metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const discordRoleOperations = new promClient.Counter({
  name: 'discord_role_operations_total',
  help: 'Total number of Discord role operations',
  labelNames: ['operation', 'status']
});

// Middleware
export function metricsMiddleware(req: any, res: any, next: any) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
}

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

### Logging Configuration

#### 1. Winston Logger

```typescript
// logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'billing-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export default logger;
```

#### 2. Log Aggregation

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.15.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:7.15.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:7.15.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

## 🔒 Security Considerations

### SSL/TLS Configuration

```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
```

### Firewall Configuration

```bash
# UFW configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000  # API server (if direct access needed)
sudo ufw allow 3001  # Discord webhook (if direct access needed)
sudo ufw enable
```

### Environment Security

```bash
# Secure environment files
chmod 600 .env
chown billing:billing .env

# Use secrets management
# AWS Secrets Manager, HashiCorp Vault, etc.
```

## 💾 Backup and Recovery

### Configuration Backup

```bash
#!/bin/bash
# backup-config.sh

BACKUP_DIR="/opt/backups/billing"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup configuration files
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
  ~/.billing/ \
  /opt/billing-api/.env \
  /etc/nginx/sites-available/billing-api

# Backup application
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" \
  /opt/billing-api/

# Clean old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR"
```

### Database Backup (if applicable)

```bash
#!/bin/bash
# backup-database.sh

pg_dump billing_production > "/opt/backups/billing/db_$(date +%Y%m%d_%H%M%S).sql"
```

### Automated Backup

```bash
# Add to crontab
0 2 * * * /opt/scripts/backup-config.sh
0 3 * * * /opt/scripts/backup-database.sh
```

---

This deployment guide covers various scenarios from simple single-server deployments to complex cloud-native architectures. Choose the deployment strategy that best fits your requirements and scale.