import { Command } from 'commander';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { configManager } from '../../utils/config';
import { MockApiService } from '../../utils/mockApi';
import { Plan } from '../../types/index';

const mockApi = MockApiService.getInstance();

export function planCommands(program: Command) {
  const planCmd = program
    .command('plan')
    .description('Manage subscription plans');

  // Create plan command
  planCmd
    .command('create')
    .description('Create a new subscription plan')
    .option('-n, --name <name>', 'plan name')
    .option('-p, --price <price>', 'plan price', parseFloat)
    .option('-c, --currency <currency>', 'currency code', 'USD')
    .option('-i, --interval <interval>', 'billing interval (monthly|yearly|weekly|daily)', 'monthly')
    .option('-d, --description <description>', 'plan description')
    .option('--features <features>', 'comma-separated list of features')
    .option('--interactive', 'use interactive mode')
    .action(async (options) => {
      try {
        // Check configuration
        const config = await configManager.loadConfig();
        if (!config) {
          console.log(chalk.red('❌ No configuration found. Run "billing init" first.'));
          return;
        }

        let planData: Partial<Plan> = {};

        if (options.interactive || (!options.name || options.price === undefined)) {
          console.log(chalk.blue('📋 Creating a new subscription plan...\n'));

          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Plan name:',
              default: options.name,
              validate: (input) => input.length > 0 || 'Plan name is required'
            },
            {
              type: 'number',
              name: 'price',
              message: 'Plan price:',
              default: options.price,
              validate: (input) => input > 0 || 'Price must be greater than 0'
            },
            {
              type: 'list',
              name: 'currency',
              message: 'Currency:',
              choices: ['USD', 'EUR', 'GBP', 'BTC', 'ETH'],
              default: options.currency || 'USD'
            },
            {
              type: 'list',
              name: 'interval',
              message: 'Billing interval:',
              choices: ['monthly', 'yearly', 'weekly', 'daily'],
              default: options.interval || 'monthly'
            },
            {
              type: 'input',
              name: 'description',
              message: 'Plan description (optional):',
              default: options.description || ''
            },
            {
              type: 'input',
              name: 'features',
              message: 'Features (comma-separated, optional):',
              default: options.features || ''
            }
          ]);

          planData = {
            name: answers.name,
            price: answers.price,
            currency: answers.currency,
            interval: answers.interval as Plan['interval'],
            description: answers.description || undefined,
            features: answers.features ? answers.features.split(',').map((f: string) => f.trim()).filter((f: string) => f) : undefined
          };
        } else {
          planData = {
            name: options.name,
            price: options.price,
            currency: options.currency,
            interval: options.interval as Plan['interval'],
            description: options.description,
            features: options.features ? options.features.split(',').map((f: string) => f.trim()).filter((f: string) => f) : undefined
          };
        }

        console.log(chalk.blue('🔄 Creating plan...'));

        const result = await mockApi.createPlan(planData as Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>);

        if (result.success && result.data) {
          console.log(chalk.green('✅ Plan created successfully!\n'));
          
          console.log(chalk.bold('Plan Details:'));
          console.log(`${chalk.gray('ID:')} ${result.data.id}`);
          console.log(`${chalk.gray('Name:')} ${result.data.name}`);
          console.log(`${chalk.gray('Price:')} ${result.data.price} ${result.data.currency}`);
          console.log(`${chalk.gray('Interval:')} ${result.data.interval}`);
          
          if (result.data.description) {
            console.log(`${chalk.gray('Description:')} ${result.data.description}`);
          }
          
          if (result.data.features && result.data.features.length > 0) {
            console.log(`${chalk.gray('Features:')} ${result.data.features.join(', ')}`);
          }
          
          console.log(`${chalk.gray('Created:')} ${result.data.createdAt.toLocaleString()}\n`);
          
          console.log(chalk.blue('💡 Next steps:'));
          console.log(chalk.white(`  billing invoice create --plan-id ${result.data.id} --wallet 0x123...`));
        } else {
          console.error(chalk.red('❌ Failed to create plan:'), result.error);
        }

      } catch (error) {
        console.error(chalk.red('❌ Error creating plan:'), error instanceof Error ? error.message : 'Unknown error');
        if (process.env.VERBOSE) {
          console.error(error instanceof Error ? error.stack : error);
        }
        process.exit(1);
      }
    });

  // List plans command
  planCmd
    .command('list')
    .alias('ls')
    .description('List all subscription plans')
    .option('--json', 'output as JSON')
    .action(async (options) => {
      try {
        const config = await configManager.loadConfig();
        if (!config) {
          console.log(chalk.red('❌ No configuration found. Run "billing init" first.'));
          return;
        }

        console.log(chalk.blue('📋 Fetching plans...'));

        const result = await mockApi.listPlans();

        if (result.success && result.data) {
          if (options.json) {
            console.log(JSON.stringify(result.data, null, 2));
            return;
          }

          if (result.data.length === 0) {
            console.log(chalk.yellow('📭 No plans found. Create one with "billing plan create".'));
            return;
          }

          console.log(chalk.green(`✅ Found ${result.data.length} plan(s):\n`));

          result.data.forEach((plan, index) => {
            console.log(chalk.bold(`${index + 1}. ${plan.name}`));
            console.log(`   ${chalk.gray('ID:')} ${plan.id}`);
            console.log(`   ${chalk.gray('Price:')} ${plan.price} ${plan.currency}/${plan.interval}`);
            
            if (plan.description) {
              console.log(`   ${chalk.gray('Description:')} ${plan.description}`);
            }
            
            if (plan.features && plan.features.length > 0) {
              console.log(`   ${chalk.gray('Features:')} ${plan.features.join(', ')}`);
            }
            
            console.log(`   ${chalk.gray('Created:')} ${plan.createdAt.toLocaleString()}`);
            console.log('');
          });

          console.log(chalk.blue('💡 Create an invoice:'));
          console.log(chalk.white('  billing invoice create --plan-id <PLAN_ID> --wallet <WALLET_ADDRESS>'));
        } else {
          console.error(chalk.red('❌ Failed to fetch plans:'), result.error);
        }

      } catch (error) {
        console.error(chalk.red('❌ Error fetching plans:'), error instanceof Error ? error.message : 'Unknown error');
        if (process.env.VERBOSE) {
          console.error(error instanceof Error ? error.stack : error);
        }
        process.exit(1);
      }
    });

  // Get plan command
  planCmd
    .command('get <planId>')
    .description('Get details of a specific plan')
    .option('--json', 'output as JSON')
    .action(async (planId, options) => {
      try {
        const config = await configManager.loadConfig();
        if (!config) {
          console.log(chalk.red('❌ No configuration found. Run "billing init" first.'));
          return;
        }

        console.log(chalk.blue(`🔍 Fetching plan ${planId}...`));

        const result = await mockApi.getPlan(planId);

        if (result.success && result.data) {
          if (options.json) {
            console.log(JSON.stringify(result.data, null, 2));
            return;
          }

          const plan = result.data;
          console.log(chalk.green('✅ Plan found:\n'));
          
          console.log(chalk.bold(plan.name));
          console.log(`${chalk.gray('ID:')} ${plan.id}`);
          console.log(`${chalk.gray('Price:')} ${plan.price} ${plan.currency}`);
          console.log(`${chalk.gray('Interval:')} ${plan.interval}`);
          
          if (plan.description) {
            console.log(`${chalk.gray('Description:')} ${plan.description}`);
          }
          
          if (plan.features && plan.features.length > 0) {
            console.log(`${chalk.gray('Features:')} ${plan.features.join(', ')}`);
          }
          
          console.log(`${chalk.gray('Created:')} ${plan.createdAt.toLocaleString()}`);
          console.log(`${chalk.gray('Updated:')} ${plan.updatedAt.toLocaleString()}`);
        } else {
          console.error(chalk.red('❌ Plan not found:'), result.error);
        }

      } catch (error) {
        console.error(chalk.red('❌ Error fetching plan:'), error instanceof Error ? error.message : 'Unknown error');
        if (process.env.VERBOSE) {
          console.error(error instanceof Error ? error.stack : error);
        }
        process.exit(1);
      }
    });
}