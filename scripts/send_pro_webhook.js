const crypto = require('crypto');
const http = require('http');

const url = 'http://localhost:3003/webhook';
const secret = 'test_secret_123';
const timestamp = Math.floor(Date.now()/1000).toString();

const event = {
  id: `wh_test_${Date.now()}`,
  type: 'invoice.paid',
  data: {
    invoice: {
      id: 'inv_test_' + Date.now(),
      planId: 'pro',
      metadata: {
        discordUserId: '1088605072700743782'
      }
    }
  },
  timestamp: new Date().toISOString(),
  signature: ''
};

const payload = JSON.stringify(event);
const signature = 'sha256=' + crypto.createHmac('sha256', secret)
  .update(`${timestamp}.${payload}`, 'utf8')
  .digest('hex');

const { URL } = require('url');
const u = new URL(url);
const opts = {
  hostname: u.hostname,
  port: u.port,
  path: u.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Timestamp': timestamp,
    'X-Webhook-Signature': signature
  }
};

const req = http.request(opts, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
});

req.on('error', e => {
  console.error('Error:', e.message);
  process.exit(1);
});

req.write(payload);
req.end();