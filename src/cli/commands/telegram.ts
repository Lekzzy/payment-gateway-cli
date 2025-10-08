import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { TelegramConfigManager } from '../../telegram/config';
import { TelegramAdapter } from '../../telegram/client';

export const adapterCommand = new Command('adapter');
const telegramSub = new Command('telegram');

telegramSub
  .description('Telegram adapter for group automation tied to billing events')
  .addCommand(initCommand())
  .addCommand(testCommand())
  .addCommand(notifyCommand());

adapterCommand.addCommand(telegramSub);

function initCommand(): Command {
  const cmd = new Command('init');
  cmd.description('Configure Telegram bot, admin chat, and plan-group mappings');
  cmd.action(async () => {
    try {
      const cfgManager = new TelegramConfigManager();
      const existing = await cfgManager.loadConfig();
      const answers = await inquirer.prompt([
        { name: 'botToken', type: 'password', mask: '*', message: 'Telegram bot token', default: existing?.botToken || process.env.TELEGRAM_BOT_TOKEN || '' },
        { name: 'adminChatId', type: 'input', message: 'Admin chat ID', default: existing?.adminChatId || '' },
        { name: 'webhookSecret', type: 'password', mask: '*', message: 'Webhook secret (optional)', default: existing?.webhookSecret || '' }
      ]);

      const config = { ...(existing || { botToken: '', adminChatId: '', planGroupMapping: {} }), ...answers };
      await cfgManager.saveConfig(config);
      console.log(chalk.green(`Saved Telegram config at ${cfgManager.getConfigPath()}`));

      // Optionally map a plan to a group
      const { mapPlan } = await inquirer.prompt([{ name: 'mapPlan', type: 'confirm', message: 'Map a plan to a group now?' }]);
      if (mapPlan) {
        const { planId, chatId, title } = await inquirer.prompt([
          { name: 'planId', type: 'input', message: 'Plan ID' },
          { name: 'chatId', type: 'input', message: 'Telegram group/channel chat ID' },
          { name: 'title', type: 'input', message: 'Mapping title (optional)' }
        ]);
        await cfgManager.addPlanGroupMapping(planId, chatId, title);
        console.log(chalk.green(`Mapped plan ${planId} to chat ${chatId}`));
      }
    } catch (error: any) {
      console.error(chalk.red('Failed to initialize Telegram adapter:'), error.message);
      process.exit(1);
    }
  });
  return cmd;
}

function testCommand(): Command {
  const cmd = new Command('test');
  cmd.description('Test Telegram connectivity and simulate join/leave for a user');
  cmd.option('--user <chatId>', 'User chat ID to DM or remove');
  cmd.option('--plan <planId>', 'Plan ID to use for mapping');
  cmd.action(async (opts) => {
    try {
      const cfgManager = new TelegramConfigManager();
      const config = await cfgManager.loadConfig();
      if (!config) {
        console.error(chalk.red('No Telegram config found. Run: billing adapter telegram init'));
        process.exit(1);
      }
      const adapter = new TelegramAdapter(config);
      const ok = await adapter.testConnection();
      console.log(ok.success ? chalk.green(ok.message) : chalk.red(ok.message));

      if (opts.user && opts.plan) {
        const { action } = await inquirer.prompt([{ name: 'action', type: 'list', choices: ['join', 'leave'], message: 'Simulate action' }]);
        if (action === 'join') {
          const resp = await adapter.addUserToPlanGroup(opts.user, opts.plan);
          console.log(resp.success ? chalk.green(resp.message) : chalk.red(resp.message));
        } else {
          const resp = await adapter.removeUserFromPlanGroup(opts.user, opts.plan);
          console.log(resp.success ? chalk.green(resp.message) : chalk.red(resp.message));
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Telegram test failed:'), error.message);
      process.exit(1);
    }
  });
  return cmd;
}

function notifyCommand(): Command {
  const cmd = new Command('notify');
  cmd.description('Send a notification to admin or a plan-mapped group');
  cmd
    .option('--admin', 'Send to admin chat')
    .option('--plan <planId>', 'Plan ID to notify mapped group')
    .option('--chat <chatId>', 'Specific chat ID to notify')
    .option('--text <message>', 'Message text to send');
  cmd.action(async (opts) => {
    try {
      const cfgManager = new TelegramConfigManager();
      const config = await cfgManager.loadConfig();
      if (!config) {
        console.error(chalk.red('No Telegram config found. Run: billing adapter telegram init'));
        process.exit(1);
      }

      let text = opts.text;
      if (!text) {
        const answer = await inquirer.prompt([{ name: 'text', type: 'input', message: 'Message text:' }]);
        text = answer.text;
      }
      const adapter = new TelegramAdapter(config);
      let result;
      if (opts.admin) {
        result = await adapter.notifyAdmin(text);
      } else if (opts.plan) {
        result = await adapter.notifyGroupByPlan(opts.plan, text);
      } else if (opts.chat) {
        result = await adapter.sendMessage(opts.chat, text);
      } else {
        console.error(chalk.red('Specify one of --admin, --plan <id>, or --chat <id>'));
        process.exit(1);
      }
      console.log(result.success ? chalk.green(result.message) : chalk.red(result.message));
    } catch (error: any) {
      console.error(chalk.red('Telegram notify failed:'), error.message);
      process.exit(1);
    }
  });
  return cmd;
}