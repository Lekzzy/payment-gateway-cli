import { Command } from 'commander';
import * as inquirer from 'inquirer';
import * as chalk from 'chalk';
import { configManager } from '../../utils/config';
import { CLIConfig } from '../../types/index';

export function initCommand(program: Command) {
  program
    .command('init')
    .description('Initialize billing CLI with API key and merchant wallet')
    .option('-k, --api-key <key>', 'API key for billing system')
    .option('-w, --wallet <address>', 'merchant wallet address')
    .option('-e, --environment <env>', 'environment (test|live)', 'test')
    .option('-u, --base-url <url>', 'custom base URL for API')
    .option('-f, --force', 'overwrite existing configuration')
    .action(async (options) => {
      try {
        console.log(chalk.blue('🚀 Initializing Billing CLI...\n'));

        // Check if config already exists
        const hasExistingConfig = await configManager.hasConfig();
        
        if (hasExistingConfig && !options.force) {
          const { overwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message: 'Configuration already exists. Do you want to overwrite it?',
              default: false
            }
          ]);
          
          if (!overwrite) {
            console.log(chalk.yellow('Configuration unchanged.'));
            return;
          }
        }

        let config: Partial<CLIConfig> = {};

        // Get API key
        if (options.apiKey) {
          config.apiKey = options.apiKey;
        } else {
          const { apiKey } = await inquirer.prompt([
            {
              type: 'password',
              name: 'apiKey',
              message: 'Enter your API key:',
              mask: '*',
              validate: (input) => {
                if (!input || input.length < 10) {
                  return 'API key must be at least 10 characters long';
                }
                if (!input.startsWith('sk_')) {
                  return 'API key should start with "sk_"';
                }
                return true;
              }
            }
          ]);
          config.apiKey = apiKey;
        }

        // Get merchant wallet
        if (options.wallet) {
          config.merchantWallet = options.wallet;
        } else {
          const { wallet } = await inquirer.prompt([
            {
              type: 'input',
              name: 'wallet',
              message: 'Enter your merchant wallet address:',
              validate: (input) => {
                if (!input || input.length < 20) {
                  return 'Wallet address must be at least 20 characters long';
                }
                if (!input.startsWith('0x')) {
                  return 'Wallet address should start with "0x"';
                }
                return true;
              }
            }
          ]);
          config.merchantWallet = wallet;
        }

        // Set environment
        config.environment = options.environment as 'test' | 'live';

        // Set base URL
        if (options.baseUrl) {
          config.baseUrl = options.baseUrl;
        } else {
          config.baseUrl = config.environment === 'live' 
            ? 'https://api.billing.live' 
            : 'https://api.billing.test';
        }

        // Save configuration
        await configManager.saveConfig(config as CLIConfig);

        console.log(chalk.green('✅ Configuration saved successfully!\n'));
        
        // Display configuration summary
        console.log(chalk.bold('Configuration Summary:'));
        console.log(`${chalk.gray('API Key:')} ${config.apiKey?.substring(0, 10)}...`);
        console.log(`${chalk.gray('Merchant Wallet:')} ${config.merchantWallet}`);
        console.log(`${chalk.gray('Environment:')} ${config.environment}`);
        console.log(`${chalk.gray('Base URL:')} ${config.baseUrl}`);
        console.log(`${chalk.gray('Config Path:')} ${configManager.getConfigPath()}\n`);

        console.log(chalk.blue('🎉 You\'re all set! Try running:'));
        console.log(chalk.white('  billing plan create --help'));
        console.log(chalk.white('  billing invoice create --help'));

      } catch (error) {
        console.error(chalk.red('❌ Initialization failed:'), error instanceof Error ? error.message : 'Unknown error');
        if (process.env.VERBOSE) {
          console.error(error instanceof Error ? error.stack : error);
        }
        process.exit(1);
      }
    });

  // Add a status command to check current configuration
  program
    .command('status')
    .description('Show current configuration status')
    .action(async () => {
      try {
        const config = await configManager.loadConfig();
        
        if (!config) {
          console.log(chalk.yellow('⚠️  No configuration found. Run "billing init" to get started.'));
          return;
        }

        console.log(chalk.blue('📋 Current Configuration:\n'));
        console.log(`${chalk.gray('API Key:')} ${config.apiKey?.substring(0, 10)}...`);
        console.log(`${chalk.gray('Merchant Wallet:')} ${config.merchantWallet}`);
        console.log(`${chalk.gray('Environment:')} ${config.environment || 'test'}`);
        console.log(`${chalk.gray('Base URL:')} ${config.baseUrl || 'default'}`);
        console.log(`${chalk.gray('Config Path:')} ${configManager.getConfigPath()}`);
        
        if (config.updatedAt) {
          console.log(`${chalk.gray('Last Updated:')} ${new Date(config.updatedAt).toLocaleString()}`);
        }

      } catch (error) {
        console.error(chalk.red('❌ Failed to load configuration:'), error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
      }
    });
}