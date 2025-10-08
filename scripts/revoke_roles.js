const crypto = require('crypto');
const http = require('http');

async function sendWebhook(userId) {
  const url = 'http://localhost:3003/webhook';
  const secret = 'test_secret_123';
  const timestamp = Math.floor(Date.now()/1000).toString();

  const event = {
    id: `wh_test_${Date.now()}`,
    type: 'subscription.cancelled',
    data: {
      subscription: {
        planId: 'pro',
        metadata: {
          discordUserId: userId
        }
      }
    },
    timestamp: new Date().toISOString()
  };

  const payload = JSON.stringify(event);
  const signature = 'sha256=' + crypto.createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex');

  const { URL } = require('url');
  const u = new URL(url);
  
  return new Promise((resolve, reject) => {
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
        console.log(`Status for ${userId}:`, res.statusCode);
        console.log('Body:', data);
        resolve();
      });
    });

    req.on('error', e => {
      console.error('Error:', e.message);
      reject(e);
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  const users = [
    { name: 'nerdydave', id: '858766932555202590' },
    { name: 'lekzzy', id: '1088605072700743782' }
  ];

  for (const user of users) {
    console.log(`\nRevoking role for ${user.name}...`);
    await sendWebhook(user.id);
  }
}

main().catch(console.error);