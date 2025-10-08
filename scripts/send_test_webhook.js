const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const [key, value] = process.argv[i].split('=');
    if (key.startsWith('--')) {
      const k = key.slice(2);
      args[k] = value !== undefined ? value : true;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const url = args.url || 'http://localhost:3003/webhook';
  const secret = args.secret || 'test_secret_123';
  const plan = args.plan || 'pro';
  const member = args.member;

  if (!member) {
    console.error('Missing required argument: --member=<discord_user_id>');
    process.exit(1);
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const event = {
    id: `wh_test_${Date.now()}`,
    type: 'invoice.paid',
    data: {
      invoice: {
        id: 'inv_test_' + Date.now(),
        planId: plan,
        metadata: { discordUserId: member },
      },
    },
    timestamp: new Date().toISOString(),
    signature: '',
  };

  const payload = JSON.stringify(event);
  const signature =
    'sha256=' +
    crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`, 'utf8').digest('hex');

  const u = new URL(url);
  const opts = {
    hostname: u.hostname,
    port: u.port || 80,
    path: u.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Signature': signature,
    },
  };

  const req = http.request(opts, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Body:', data);
      process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1);
    });
  });
  req.on('error', (e) => {
    console.error('Error:', e.message);
    process.exit(1);
  });
  req.write(payload);
  req.end();
}

main();