import { Command } from 'commander';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { configManager } from '../../utils/config';
import { MockApiService } from '../../utils/mockApi';

const mockApi = MockApiService.getInstance();

export function invoiceCommands(program: Command) {
  const invoiceCmd = program
    .command('invoice')
    .description('Manage invoices');

  // Create invoice command
  invoiceCmd
    .command('create')
    .description('Create a new invoice')
    .option('-p, --plan-id <planId>', 'plan ID to create invoice for')
    .option('-w, --wallet <wallet>', 'customer wallet address')
    .option('-d, --description <description>', 'invoice description')
    .option('--interactive', 'use interactive mode')
    .action(async (options) => {
      try {
        const config = await configManager.loadConfig();
        if (!config) {
          console.log(chalk.red('❌ No configuration found. Run "billing init" first.'));
          return;
        }

        let invoiceData: { planId: string; wallet: string; description?: string } = {
          planId: '',
          wallet: '',
          description: undefined
        };

        if (options.interactive || !options.planId || !options.wallet) {
          console.log(chalk.blue('📄 Creating a new invoice...\n'));

          // First, show available plans
          const plansResult = await mockApi.listPlans();
          if (plansResult.success && plansResult.data && plansResult.data.length > 0) {
            console.log(chalk.gray('Available plans:'));
            plansResult.data.forEach(plan => {
              console.log(`  ${chalk.cyan(plan.id)} - ${plan.name} (${plan.price} ${plan.currency}/${plan.interval})`);
            });
            console.log('');
          }

          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'planId',
              message: 'Plan ID:',
              default: options.planId,
              validate: (input) => input.length > 0 || 'Plan ID is required'
            },
            {
              type: 'input',
              name: 'wallet',
              message: 'Customer wallet address:',
              default: options.wallet,
              validate: (input) => {
                if (!input || input.length < 20) {
                  return 'Wallet address must be at least 20 characters long';
                }
                if (!input.startsWith('0x')) {
                  return 'Wallet address should start with "0x"';
                }
                return true;
              }
            },
            {
              type: 'input',
              name: 'description',
              message: 'Invoice description (optional):',
              default: options.description || ''
            }
          ]);

          invoiceData = {
            planId: answers.planId,
            wallet: answers.wallet,
            description: answers.description || undefined
          };
        } else {
          invoiceData = {
            planId: options.planId,
            wallet: options.wallet,
            description: options.description
          };
        }

        console.log(chalk.blue('🔄 Creating invoice...'));

        const result = await mockApi.createInvoice(invoiceData);

        if (result.success && result.data) {
          console.log(chalk.green('✅ Invoice created successfully!\n'));
          
          const invoice = result.data;
          console.log(chalk.bold('Invoice Details:'));
          console.log(`${chalk.gray('ID:')} ${invoice.id}`);
          console.log(`${chalk.gray('Plan ID:')} ${invoice.planId}`);
          console.log(`${chalk.gray('Amount:')} ${invoice.amount} ${invoice.currency}`);
          console.log(`${chalk.gray('Status:')} ${getStatusColor(invoice.status)}`);
          console.log(`${chalk.gray('Customer Wallet:')} ${invoice.wallet}`);
          console.log(`${chalk.gray('Merchant:')} ${invoice.merchantName}`);
          console.log(`${chalk.gray('Description:')} ${invoice.description}`);
          console.log(`${chalk.gray('Expires:')} ${invoice.expiryTime ? invoice.expiryTime.toLocaleString() : 'No expiry'}`);
          console.log(`${chalk.gray('Created:')} ${invoice.createdAt.toLocaleString()}`);
          
          if (invoice.paymentUrl) {
            console.log(`${chalk.gray('Payment URL:')} ${chalk.blue(invoice.paymentUrl)}`);
          }
          
          console.log('\n' + chalk.blue('💡 Next steps:'));
          console.log(chalk.white(`  billing invoice status ${invoice.id}`));
          console.log(chalk.white(`  billing webhook test invoice.paid --invoice-id ${invoice.id}`));
        } else {
          console.error(chalk.red('❌ Failed to create invoice:'), result.error);
        }

      } catch (error) {
        console.error(chalk.red('❌ Error creating invoice:'), error instanceof Error ? error.message : 'Unknown error');
        if (process.env.VERBOSE) {
          console.error(error instanceof Error ? error.stack : error);
        }
        process.exit(1);
      }
    });

  // Get invoice status command
  invoiceCmd
    .command('status <invoiceId>')
    .description('Check invoice status')
    .option('--json', 'output as JSON')
    .option('--poll', 'poll for status changes')
    .option('--interval <seconds>', 'polling interval in seconds', '5')
    .action(async (invoiceId, options) => {
      try {
        const config = await configManager.loadConfig();
        if (!config) {
          console.log(chalk.red('❌ No configuration found. Run "billing init" first.'));
          return;
        }

        const checkStatus = async () => {
          const result = await mockApi.getInvoice(invoiceId);
          
          if (result.success && result.data) {
            if (options.json) {
              console.log(JSON.stringify({
                id: result.data.id,
                status: result.data.status,
                amount: result.data.amount,
                currency: result.data.currency,
                lastUpdated: result.data.updatedAt
              }, null, 2));
              return result.data;
            }

            console.log(chalk.blue(`🔍 Invoice ${invoiceId} status:`));
            console.log(`${chalk.gray('Status:')} ${getStatusColor(result.data.status)}`);
            console.log(`${chalk.gray('Amount:')} ${result.data.amount} ${result.data.currency}`);
            console.log(`${chalk.gray('Last Updated:')} ${result.data.updatedAt.toLocaleString()}`);
            
            if (result.data.status === 'unpaid') {
              const timeLeft = result.data.expiryTime ? result.data.expiryTime.getTime() - Date.now() : 0;
              if (timeLeft > 0) {
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                console.log(`${chalk.gray('Expires in:')} ${hours}h ${minutes}m`);
              } else {
                console.log(chalk.red('⚠️  Invoice has expired'));
              }
            }
            
            return result.data;
          } else {
            console.error(chalk.red('❌ Invoice not found:'), result.error);
            return null;
          }
        };

        if (options.poll) {
          console.log(chalk.blue(`🔄 Polling invoice status every ${options.interval} seconds... (Press Ctrl+C to stop)\n`));
          
          const interval = setInterval(async () => {
            const invoice = await checkStatus();
            console.log(''); // Add spacing between polls
            
            if (invoice && (invoice.status === 'paid' || invoice.status === 'failed' || invoice.status === 'refunded')) {
              console.log(chalk.green('✅ Final status reached. Stopping poll.'));
              clearInterval(interval);
              process.exit(0);
            }
          }, parseInt(options.interval) * 1000);

          // Handle Ctrl+C
          process.on('SIGINT', () => {
            clearInterval(interval);
            console.log(chalk.yellow('\n⏹️  Polling stopped.'));
            process.exit(0);
          });
        } else {
          await checkStatus();
        }

      } catch (error) {
        console.error(chalk.red('❌ Error checking invoice status:'), error instanceof Error ? error.message : 'Unknown error');
        if (process.env.VERBOSE) {
          console.error(error instanceof Error ? error.stack : error);
        }
        process.exit(1);
      }
    });

  // Get invoice details command
  invoiceCmd
    .command('get <invoiceId>')
    .description('Get full invoice details')
    .option('--json', 'output as JSON')
    .action(async (invoiceId, options) => {
      try {
        const config = await configManager.loadConfig();
        if (!config) {
          console.log(chalk.red('❌ No configuration found. Run "billing init" first.'));
          return;
        }

        console.log(chalk.blue(`🔍 Fetching invoice ${invoiceId}...`));

        const result = await mockApi.getInvoice(invoiceId);

        if (result.success && result.data) {
          if (options.json) {
            console.log(JSON.stringify(result.data, null, 2));
            return;
          }

          const invoice = result.data;
          console.log(chalk.green('✅ Invoice found:\n'));
          
          console.log(chalk.bold(`Invoice ${invoice.id}`));
          console.log(`${chalk.gray('Plan ID:')} ${invoice.planId}`);
          console.log(`${chalk.gray('Amount:')} ${invoice.amount} ${invoice.currency}`);
          console.log(`${chalk.gray('Status:')} ${getStatusColor(invoice.status)}`);
          console.log(`${chalk.gray('Customer Wallet:')} ${invoice.wallet}`);
          console.log(`${chalk.gray('Merchant:')} ${invoice.merchantName}`);
          console.log(`${chalk.gray('Description:')} ${invoice.description}`);
          console.log(`${chalk.gray('Expires:')} ${invoice.expiryTime ? invoice.expiryTime.toLocaleString() : 'No expiry'}`);
          console.log(`${chalk.gray('Created:')} ${invoice.createdAt.toLocaleString()}`);
          console.log(`${chalk.gray('Updated:')} ${invoice.updatedAt.toLocaleString()}`);
          
          if (invoice.paymentUrl) {
            console.log(`${chalk.gray('Payment URL:')} ${chalk.blue(invoice.paymentUrl)}`);
          }
        } else {
          console.error(chalk.red('❌ Invoice not found:'), result.error);
        }

      } catch (error) {
        console.error(chalk.red('❌ Error fetching invoice:'), error instanceof Error ? error.message : 'Unknown error');
        if (process.env.VERBOSE) {
          console.error(error instanceof Error ? error.stack : error);
        }
        process.exit(1);
      }
    });

  // Simulate payment (for testing)
  invoiceCmd
    .command('pay <invoiceId>')
    .description('Simulate payment for testing (mock only)')
    .action(async (invoiceId) => {
      try {
        const config = await configManager.loadConfig();
        if (!config) {
          console.log(chalk.red('❌ No configuration found. Run "billing init" first.'));
          return;
        }

        console.log(chalk.blue(`💳 Simulating payment for invoice ${invoiceId}...`));

        const result = await mockApi.simulatePayment(invoiceId);

        if (result.success && result.data) {
          console.log(chalk.green('✅ Payment simulation successful!'));
          console.log(`${chalk.gray('Invoice Status:')} ${getStatusColor(result.data.status)}`);
          console.log(`${chalk.gray('Amount Paid:')} ${result.data.amount} ${result.data.currency}`);
          console.log(chalk.blue('🔔 Webhook "invoice.paid" event sent'));
        } else {
          console.error(chalk.red('❌ Payment simulation failed:'), result.error);
        }

      } catch (error) {
        console.error(chalk.red('❌ Error simulating payment:'), error instanceof Error ? error.message : 'Unknown error');
        if (process.env.VERBOSE) {
          console.error(error instanceof Error ? error.stack : error);
        }
        process.exit(1);
      }
    });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return chalk.green(status);
    case 'unpaid':
      return chalk.yellow(status);
    case 'processing':
      return chalk.blue(status);
    case 'failed':
      return chalk.red(status);
    case 'refunded':
      return chalk.magenta(status);
    default:
      return chalk.gray(status);
  }
}