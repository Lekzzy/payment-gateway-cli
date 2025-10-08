import { Command } from 'commander';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { configManager } from '../../utils/config';
import { MockApiService } from '../../utils/mockApi';

const mockApi = MockApiService.getInstance();

export function refundCommands(program: Command) {
  const refundCmd = program
    .command('refund')
    .description('Manage refunds');

  // Mark invoice as refunded
  refundCmd
    .command('mark <invoiceId>')
    .description('Mark an invoice as refunded')
    .option('-r, --reason <reason>', 'reason for refund')
    .option('--confirm', 'skip confirmation prompt')
    .action(async (invoiceId, options) => {
      try {
        const config = await configManager.loadConfig();
        if (!config) {
          console.log(chalk.red('❌ No configuration found. Run "billing init" first.'));
          return;
        }

        // First, get the invoice details
        console.log(chalk.blue(`🔍 Fetching invoice ${invoiceId}...`));
        const invoiceResult = await mockApi.getInvoice(invoiceId);

        if (!invoiceResult.success || !invoiceResult.data) {
          console.error(chalk.red('❌ Invoice not found:'), invoiceResult.error);
          return;
        }

        const invoice = invoiceResult.data;

        // Check if invoice can be refunded
        if (invoice.status !== 'paid') {
          console.error(chalk.red(`❌ Cannot refund invoice with status: ${invoice.status}`));
          console.log(chalk.yellow('Only paid invoices can be refunded.'));
          return;
        }

        // Show invoice details
        console.log(chalk.green('✅ Invoice found:\n'));
        console.log(`${chalk.gray('ID:')} ${invoice.id}`);
        console.log(`${chalk.gray('Amount:')} ${invoice.amount} ${invoice.currency}`);
        console.log(`${chalk.gray('Status:')} ${chalk.green(invoice.status)}`);
        console.log(`${chalk.gray('Customer Wallet:')} ${invoice.wallet}`);
        console.log(`${chalk.gray('Description:')} ${invoice.description}`);
        console.log('');

        let reason = options.reason;

        // Get refund reason if not provided
        if (!reason) {
          const { refundReason } = await inquirer.prompt([
            {
              type: 'input',
              name: 'refundReason',
              message: 'Reason for refund (optional):',
              default: 'Customer requested refund'
            }
          ]);
          reason = refundReason;
        }

        // Confirm refund unless --confirm flag is used
        if (!options.confirm) {
          const { confirmRefund } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirmRefund',
              message: `Are you sure you want to refund ${invoice.amount} ${invoice.currency} for invoice ${invoiceId}?`,
              default: false
            }
          ]);

          if (!confirmRefund) {
            console.log(chalk.yellow('❌ Refund cancelled.'));
            return;
          }
        }

        console.log(chalk.blue('🔄 Processing refund...'));

        const refundResult = await mockApi.createRefund(invoiceId, reason);

        if (refundResult.success && refundResult.data) {
          console.log(chalk.green('✅ Refund processed successfully!\n'));
          
          const refund = refundResult.data;
          console.log(chalk.bold('Refund Details:'));
          console.log(`${chalk.gray('Refund ID:')} ${refund.id}`);
          console.log(`${chalk.gray('Invoice ID:')} ${refund.invoiceId}`);
          console.log(`${chalk.gray('Amount:')} ${refund.amount} ${invoice.currency}`);
          console.log(`${chalk.gray('Status:')} ${chalk.green(refund.status)}`);
          console.log(`${chalk.gray('Reason:')} ${refund.reason || 'No reason provided'}`);
          console.log(`${chalk.gray('Processed:')} ${refund.createdAt.toLocaleString()}`);
          
          console.log('\n' + chalk.blue('🔔 Webhook events triggered:'));
          console.log(chalk.white('  - refund.completed'));
          
          console.log('\n' + chalk.blue('💡 Next steps:'));
          console.log(chalk.white(`  billing invoice status ${invoiceId}`));
        } else {
          console.error(chalk.red('❌ Failed to process refund:'), refundResult.error);
        }

      } catch (error) {
        console.error(chalk.red('❌ Error processing refund:'), error instanceof Error ? error.message : 'Unknown error');
        if (process.env.VERBOSE) {
          console.error(error instanceof Error ? error.stack : error);
        }
        process.exit(1);
      }
    });

  // List refunds (future enhancement)
  refundCmd
    .command('list')
    .alias('ls')
    .description('List all refunds')
    .option('--json', 'output as JSON')
    .option('--invoice-id <invoiceId>', 'filter by invoice ID')
    .action(async (options) => {
      try {
        const config = await configManager.loadConfig();
        if (!config) {
          console.log(chalk.red('❌ No configuration found. Run "billing init" first.'));
          return;
        }

        console.log(chalk.blue('📋 Fetching refunds...'));

        // For now, we'll show a message that this feature is coming soon
        // In a real implementation, you'd have an API endpoint to list refunds
        console.log(chalk.yellow('📋 Refund listing feature coming soon!'));
        console.log(chalk.gray('For now, you can check individual invoice statuses:'));
        console.log(chalk.white('  billing invoice status <INVOICE_ID>'));

      } catch (error) {
        console.error(chalk.red('❌ Error fetching refunds:'), error instanceof Error ? error.message : 'Unknown error');
        if (process.env.VERBOSE) {
          console.error(error instanceof Error ? error.stack : error);
        }
        process.exit(1);
      }
    });

  // Check refund status
  refundCmd
    .command('status <refundId>')
    .description('Check refund status')
    .option('--json', 'output as JSON')
    .action(async (refundId, options) => {
      try {
        const config = await configManager.loadConfig();
        if (!config) {
          console.log(chalk.red('❌ No configuration found. Run "billing init" first.'));
          return;
        }

        console.log(chalk.blue(`🔍 Checking refund ${refundId}...`));

        // For now, show a message that this would check refund status
        // In a real implementation, you'd have an API endpoint to get refund details
        console.log(chalk.yellow('🔍 Refund status checking feature coming soon!'));
        console.log(chalk.gray('For now, you can check the related invoice status:'));
        console.log(chalk.white('  billing invoice status <INVOICE_ID>'));

      } catch (error) {
        console.error(chalk.red('❌ Error checking refund status:'), error instanceof Error ? error.message : 'Unknown error');
        if (process.env.VERBOSE) {
          console.error(error instanceof Error ? error.stack : error);
        }
        process.exit(1);
      }
    });
}