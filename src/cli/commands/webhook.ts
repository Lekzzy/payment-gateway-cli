import { Command } from 'commander';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { configManager } from '../../utils/config';
import { MockApiService } from '../../utils/mockApi';
import { WebhookVerifier } from '../../utils/webhook';

const mockApi = MockApiService.getInstance();

export function webhookCommands(program: Command) {
  const webhookCmd = program
    .command('webhook')
    .description('Test and manage webhooks');

  // Test webhook command
  webhookCmd
    .command('test <eventType>')
    .description('Send a test webhook event (invoice.paid, subscription.expired)')
    .option('--invoice-id <invoiceId>', 'invoice ID for invoice events')
    .option('--plan-id <planId>', 'plan ID for subscription events')
    .option('--url <url>', 'webhook URL to send to')
    .option('--secret <secret>', 'webhook secret for signature')
    .option('--dry-run', 'show webhook payload without sending')
    .action(async (eventType, options) => {
      try {
        const config = await configManager.loadConfig();
        if (!config) {
          console.log(chalk.red('❌ No configuration found. Run "billing init" first.'));
          return;
        }

        // Validate event type
        const validEvents = ['invoice.paid', 'invoice.failed', 'subscription.expired', 'refund.completed'];
        if (!validEvents.includes(eventType)) {
          console.error(chalk.red(`❌ Invalid event type: ${eventType}`));
          console.log(chalk.yellow(`Valid events: ${validEvents.join(', ')}`));
          return;
        }

        let webhookData: any = {};

        // Prepare webhook data based on event type
        switch (eventType) {
          case 'invoice.paid':
          case 'invoice.failed': {
            if (!options.invoiceId) {
              const { invoiceId } = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'invoiceId',
                  message: 'Invoice ID:',
                  validate: (input) => input.length > 0 || 'Invoice ID is required'
                }
              ]);
              options.invoiceId = invoiceId;
            }

            // Get invoice details
            const invoiceResult = await mockApi.getInvoice(options.invoiceId);
            if (!invoiceResult.success || !invoiceResult.data) {
              console.error(chalk.red('❌ Invoice not found:'), invoiceResult.error);
              return;
            }

            webhookData = {
              invoice: invoiceResult.data,
              planId: invoiceResult.data.planId,
              amount: invoiceResult.data.amount,
              currency: invoiceResult.data.currency,
              customerWallet: invoiceResult.data.wallet
            };
            break;
          }

          case 'subscription.expired': {
            if (!options.planId) {
              const { planId } = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'planId',
                  message: 'Plan ID:',
                  validate: (input) => input.length > 0 || 'Plan ID is required'
                }
              ]);
              options.planId = planId;
            }

            webhookData = {
              planId: options.planId,
              expiredAt: new Date(),
              reason: 'subscription_period_ended'
            };
            break;
          }

          case 'refund.completed': {
            if (!options.invoiceId) {
              const { invoiceId } = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'invoiceId',
                  message: 'Invoice ID:',
                  validate: (input) => input.length > 0 || 'Invoice ID is required'
                }
              ]);
              options.invoiceId = invoiceId;
            }

            // Get invoice details for refund
            const refundInvoiceResult = await mockApi.getInvoice(options.invoiceId);
            if (!refundInvoiceResult.success || !refundInvoiceResult.data) {
              console.error(chalk.red('❌ Invoice not found:'), refundInvoiceResult.error);
              return;
            }

            webhookData = {
              invoiceId: options.invoiceId,
              amount: refundInvoiceResult.data.amount,
              currency: refundInvoiceResult.data.currency,
              reason: 'customer_request',
              refundedAt: new Date()
            };
            break;
          }
        }

        console.log(chalk.blue(`🔔 Preparing ${eventType} webhook...`));

        // Create webhook event
        const webhookResult = await mockApi.sendWebhook(eventType as any, webhookData);

        if (!webhookResult.success || !webhookResult.data) {
          console.error(chalk.red('❌ Failed to create webhook:'), webhookResult.error);
          return;
        }

        const webhook = webhookResult.data;

        // Create signed webhook payload
        const secret = options.secret || 'test_webhook_secret_123';
        const verifier = new WebhookVerifier(secret);
        const signedWebhook = verifier.createTestWebhook(eventType as any, webhookData);

        if (options.dryRun) {
          console.log(chalk.green('✅ Webhook payload created (dry run):\n'));
          
          console.log(chalk.bold('Headers:'));
          console.log(`${chalk.gray('Content-Type:')} application/json`);
          console.log(`${chalk.gray('X-Billing-Signature:')} ${signedWebhook.signature}`);
          console.log(`${chalk.gray('X-Billing-Timestamp:')} ${signedWebhook.timestamp}`);
          console.log(`${chalk.gray('X-Billing-Event:')} ${eventType}\n`);
          
          console.log(chalk.bold('Payload:'));
          console.log(JSON.stringify(JSON.parse(signedWebhook.payload), null, 2));
          
          console.log('\n' + chalk.blue('💡 Verification example:'));
          console.log(chalk.white('  billing webhook verify --help'));
          return;
        }

        // If URL provided, simulate sending webhook
        if (options.url) {
          console.log(chalk.blue(`📤 Sending webhook to ${options.url}...`));
          
          // In a real implementation, you would make an HTTP request here
          // For now, we'll simulate it
          console.log(chalk.green('✅ Webhook sent successfully! (simulated)\n'));
          
          console.log(chalk.bold('Request Details:'));
          console.log(`${chalk.gray('URL:')} ${options.url}`);
          console.log(`${chalk.gray('Method:')} POST`);
          console.log(`${chalk.gray('Event Type:')} ${eventType}`);
          console.log(`${chalk.gray('Signature:')} ${signedWebhook.signature.substring(0, 20)}...`);
          console.log(`${chalk.gray('Timestamp:')} ${signedWebhook.timestamp}`);
        } else {
          console.log(chalk.green('✅ Test webhook created successfully!\n'));
          
          console.log(chalk.bold('Webhook Details:'));
          console.log(`${chalk.gray('Event ID:')} ${webhook.id}`);
          console.log(`${chalk.gray('Event Type:')} ${webhook.type}`);
          console.log(`${chalk.gray('Timestamp:')} ${webhook.timestamp.toLocaleString()}`);
          console.log(`${chalk.gray('Signature:')} ${webhook.signature.substring(0, 20)}...`);
          
          console.log('\n' + chalk.blue('💡 To send to a webhook URL:'));
          console.log(chalk.white(`  billing webhook test ${eventType} --url https://your-app.com/webhooks --invoice-id ${options.invoiceId || 'INVOICE_ID'}`));
        }

      } catch (error) {
        console.error(chalk.red('❌ Error starting webhook server:'), error instanceof Error ? error.message : 'Unknown error');
        if (process.env.VERBOSE) {
          console.error(error instanceof Error ? error.stack : error);
        }
        process.exit(1);
      }
    });

  // Verify webhook command
  webhookCmd
    .command('verify')
    .description('Verify a webhook signature')
    .option('-p, --payload <payload>', 'webhook payload (JSON string)')
    .option('-s, --signature <signature>', 'webhook signature')
    .option('-t, --timestamp <timestamp>', 'webhook timestamp')
    .option('--secret <secret>', 'webhook secret', 'test_webhook_secret_123')
    .action(async (options) => {
      try {
        if (!options.payload || !options.signature) {
          console.log(chalk.blue('🔐 Webhook signature verification\n'));
          
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'payload',
              message: 'Webhook payload (JSON):',
              default: options.payload,
              validate: (input) => {
                try {
                  JSON.parse(input);
                  return true;
                } catch {
                  return 'Invalid JSON payload';
                }
              }
            },
            {
              type: 'input',
              name: 'signature',
              message: 'Webhook signature:',
              default: options.signature,
              validate: (input) => input.length > 0 || 'Signature is required'
            },
            {
              type: 'input',
              name: 'timestamp',
              message: 'Webhook timestamp (optional):',
              default: options.timestamp || Math.floor(Date.now() / 1000).toString()
            },
            {
              type: 'input',
              name: 'secret',
              message: 'Webhook secret:',
              default: options.secret
            }
          ]);

          options = { ...options, ...answers };
        }

        console.log(chalk.blue('🔍 Verifying webhook signature...'));

        const verifier = new WebhookVerifier(options.secret);
        const result = verifier.verifyWebhook(
          options.payload,
          options.signature,
          options.timestamp || Math.floor(Date.now() / 1000).toString()
        );

        if (result.isValid) {
          console.log(chalk.green('✅ Webhook signature is valid!\n'));
          
          if (result.event) {
            console.log(chalk.bold('Event Details:'));
            console.log(`${chalk.gray('Event ID:')} ${result.event.id}`);
            console.log(`${chalk.gray('Event Type:')} ${result.event.type}`);
            console.log(`${chalk.gray('Timestamp:')} ${result.event.timestamp.toLocaleString()}`);
            console.log(`${chalk.gray('Data:')} ${JSON.stringify(result.event.data, null, 2)}`);
          }
        } else {
          console.log(chalk.red('❌ Webhook signature is invalid!'));
          console.log(chalk.red('Error:'), result.error);
        }

      } catch (error) {
         console.error(chalk.red('❌ Error verifying webhook:'), error instanceof Error ? error.message : 'Unknown error');
         if (process.env.VERBOSE) {
           console.error(error instanceof Error ? error.stack : error);
         }
         process.exit(1);
       }
    });

  // List webhook events (for debugging)
  webhookCmd
    .command('events')
    .description('List available webhook event types')
    .action(() => {
      console.log(chalk.blue('📋 Available webhook event types:\n'));
      
      const events = [
        {
          type: 'invoice.paid',
          description: 'Triggered when an invoice is successfully paid',
          data: 'invoice, planId, amount, currency, customerWallet'
        },
        {
          type: 'invoice.failed',
          description: 'Triggered when an invoice payment fails',
          data: 'invoice, planId, amount, currency, customerWallet, failureReason'
        },
        {
          type: 'subscription.expired',
          description: 'Triggered when a subscription expires',
          data: 'planId, expiredAt, reason'
        },
        {
          type: 'refund.completed',
          description: 'Triggered when a refund is processed',
          data: 'invoiceId, amount, currency, reason, refundedAt'
        }
      ];

      events.forEach((event, index) => {
        console.log(chalk.bold(`${index + 1}. ${event.type}`));
        console.log(`   ${chalk.gray('Description:')} ${event.description}`);
        console.log(`   ${chalk.gray('Data fields:')} ${event.data}`);
        console.log(`   ${chalk.gray('Test command:')} billing webhook test ${event.type}`);
        console.log('');
      });

      console.log(chalk.blue('💡 Example usage:'));
      console.log(chalk.white('  billing webhook test invoice.paid --invoice-id inv_123'));
      console.log(chalk.white('  billing webhook test subscription.expired --plan-id pro'));
    });
}