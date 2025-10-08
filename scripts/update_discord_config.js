const fs = require('fs');
const os = require('os');
const path = require('path');

const configDir = path.join(os.homedir(), '.billing-cli');
const configPath = path.join(configDir, 'discord-config.json');

fs.mkdirSync(configDir, { recursive: true });

const config = {
  // Do NOT hardcode secrets. Read from environment.
  botToken: process.env.DISCORD_BOT_TOKEN || '',
  guildId: "1113240635378520116",
  webhookSecret: "test_secret_123",
  planRoleMapping: {
    pro: {
      roleId: "1425351865838735391",  // Pro role ID (updated)
      roleName: "Pro"
    }
  },
  retryAttempts: 3,
  retryDelay: 1000,
  logLevel: "info",
  proSubscriptionDuration: 10,
  proNotifyBeforeExpiry: 2
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
console.log('Wrote config to', configPath);
console.log(fs.readFileSync(configPath, 'utf8'));