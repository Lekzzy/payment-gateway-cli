#!/usr/bin/env node

import { Command } from 'commander';
import * as chalk from 'chalk';
import { initCommand } from './commands/init';
import { planCommands } from './commands/plan';
import { invoiceCommands } from './commands/invoice';
import { refundCommands } from './commands/refund';
import { webhookCommands } from './commands/webhook';
import { discordCommand } from './commands/discord';
import { adapterCommand } from './commands/telegram';

const program = new Command();

program
  .name('billing')
  .description('CLI tool for billing system integrations')
  .version('1.0.0');

// Add ASCII art banner
const banner = `
${chalk.cyan('╔══════════════════════════════════════╗')}
${chalk.cyan('║')}     ${chalk.bold.white('🏦 Billing System CLI')}        ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.gray('Payment Gateway & Discord')}     ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════╝')}
`;

program.addHelpText('before', banner);

// Global options
program
  .option('-v, --verbose', 'enable verbose logging')
  .option('--config <path>', 'path to config file')
  .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    if (options.verbose) {
      process.env.VERBOSE = 'true';
    }
  });

// Register commands
initCommand(program);
planCommands(program);
invoiceCommands(program);
refundCommands(program);
webhookCommands(program);
program.addCommand(discordCommand);
program.addCommand(adapterCommand);

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`));
  console.log(chalk.yellow('See --help for a list of available commands.'));
  process.exit(1);
});

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(0);
}

// Parse command line arguments
program.parse();

// Handle any uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error.message);
  if (process.env.VERBOSE) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});