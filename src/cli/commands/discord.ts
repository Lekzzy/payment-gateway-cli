import { Command } from 'commander';
import * as inquirer from 'inquirer';
import { DiscordConfigManager } from '../../discord/config';
import { DiscordRoleManager } from '../../discord/client';
import { DiscordWebhookListener } from '../../discord/webhook-listener';
import { MockApiService } from '../../utils/mockApi';

const configManager = new DiscordConfigManager();
const mockApi = new MockApiService();

export const discordCommand = new Command('discord')
  .description('Discord integration commands');

// Discord configuration command
discordCommand
  .command('config')
  .description('Configure Discord integration')
  .option('--bot-token <token>', 'Discord bot token')
  .option('--guild-id <id>', 'Discord guild (server) ID')
  .option('--webhook-secret <secret>', 'Webhook verification secret')
  .action(async (options) => {
    try {
      console.log('🔧 Configuring Discord integration...\n');

      // Load existing config
      let config;
      try {
        config = await configManager.loadConfig();
        console.log('✅ Found existing Discord configuration');
      } catch {
        config = {
           botToken: '',
           guildId: '',
           webhookSecret: '',
           planRoleMapping: {},
           retryAttempts: 3,
           retryDelay: 1000
         };
      }

      // Interactive prompts if options not provided
       const answers = await inquirer.prompt([
         {
           type: 'input',
           name: 'botToken',
           message: 'Discord bot token:',
           default: options.botToken || config?.botToken || '',
           validate: (input) => input.length > 0 || 'Bot token is required'
         },
         {
           type: 'input',
           name: 'guildId',
           message: 'Discord guild (server) ID:',
           default: options.guildId || config?.guildId || '',
           validate: (input) => /^\d+$/.test(input) || 'Guild ID must be numeric'
         },
         {
           type: 'input',
           name: 'webhookSecret',
           message: 'Webhook verification secret:',
           default: options.webhookSecret || config?.webhookSecret || `discord_${Date.now()}`,
           validate: (input) => input.length >= 8 || 'Secret must be at least 8 characters'
         }
       ]);

      // Update configuration
       const updatedConfig = {
          ...config,
          botToken: answers.botToken,
          guildId: answers.guildId,
          webhookSecret: answers.webhookSecret,
          planRoleMapping: config?.planRoleMapping || {}
        };

      await configManager.saveConfig(updatedConfig);

      console.log('\n✅ Discord configuration saved successfully!');
      console.log('\n📋 Configuration Summary:');
      console.log(`   Guild ID: ${updatedConfig.guildId}`);
      console.log(`   Webhook Secret: ${updatedConfig.webhookSecret.substring(0, 8)}...`);
      console.log(`   Plan Mappings: ${Object.keys(updatedConfig.planRoleMapping || {}).length} configured`);

      // Test connection
      console.log('\n🔍 Testing Discord connection...');
      try {
        const roleManager = new DiscordRoleManager(updatedConfig);
        await roleManager.connect();
        
        const testResult = await roleManager.testConnection();
        if (testResult.success) {
          console.log('✅ Discord connection successful!');
          console.log(`   Connected to: ${testResult.details?.guildName}`);
          console.log(`   Members: ${testResult.details?.memberCount}`);
        }
        
        await roleManager.disconnect();
      } catch (error) {
        console.log(`❌ Discord connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.log('   Please check your bot token and guild ID');
      }

    } catch (error) {
      console.error('❌ Failed to configure Discord:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Plan-role mapping command
discordCommand
  .command('map')
  .description('Map billing plans to Discord roles')
  .option('--plan-id <id>', 'Plan ID to map')
  .option('--role-id <id>', 'Discord role ID')
  .option('--role-name <name>', 'Discord role name (for display)')
  .action(async (options) => {
    try {
      console.log('🎭 Managing plan-role mappings...\n');

      // Load available plans
       const plansResult = await mockApi.listPlans();
       
       if (!plansResult.success || !plansResult.data || plansResult.data.length === 0) {
         console.log('❌ No plans available. Create plans first using: billing plan create');
         return;
       }
       
       const plans = plansResult.data;

      // Load Discord roles if connected
      let availableRoles: any[] = [];
      try {
        const config = await configManager.loadConfig();
        if (!config) {
          console.log('⚠️  Could not fetch Discord roles. Make sure Discord is configured.');
          return;
        }
        const roleManager = new DiscordRoleManager(config);
        await roleManager.connect();
        
        const rolesResult = await roleManager.listGuildRoles();
        if (rolesResult.success) {
          availableRoles = rolesResult.roles || [];
        }
        
        await roleManager.disconnect();
      } catch (error) {
        console.log('⚠️  Could not fetch Discord roles. Make sure Discord is configured.');
      }

      // Interactive prompts if options not provided
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'planId',
          message: 'Select plan to map:',
          choices: plans.map(plan => ({
            name: `${plan.name} (${plan.id}) - $${plan.price}/${plan.interval}`,
            value: plan.id
          })),
          when: !options.planId
        },
        {
          type: 'list',
          name: 'roleId',
          message: 'Select Discord role:',
          choices: [
            ...availableRoles.map(role => ({
              name: `${role.name} (${role.memberCount} members)`,
              value: role.id
            })),
            { name: 'Enter role ID manually', value: 'manual' }
          ],
          when: !options.roleId && availableRoles.length > 0
        },
        {
          type: 'input',
          name: 'roleId',
          message: 'Discord role ID:',
          validate: (input) => /^\d+$/.test(input) || 'Role ID must be numeric',
          when: (answers) => !options.roleId && (availableRoles.length === 0 || answers.roleId === 'manual')
        },
        {
          type: 'input',
          name: 'roleName',
          message: 'Role display name (optional):',
          when: !options.roleName
        }
      ]);

      const planId = options.planId || answers.planId;
      const roleId = options.roleId || answers.roleId;
      const roleName = options.roleName || answers.roleName || `Role ${roleId}`;

      // Add mapping
      await configManager.addPlanRoleMapping(planId, roleId, roleName);

      console.log('\n✅ Plan-role mapping added successfully!');
      
      const selectedPlan = plans.find(p => p.id === planId);
      console.log(`   Plan: ${selectedPlan?.name} (${planId})`);
      console.log(`   Role: ${roleName} (${roleId})`);

      // Show all current mappings
      const mappings = await configManager.listPlanRoleMappings();
      console.log('\n📋 Current Plan-Role Mappings:');
      
      if (Object.keys(mappings).length === 0) {
        console.log('   No mappings configured');
      } else {
        for (const [pId, mapping] of Object.entries(mappings)) {
          const plan = plans.find(p => p.id === pId);
          console.log(`   ${plan?.name || pId} → ${mapping.roleName} (${mapping.roleId})`);
        }
      }

    } catch (error) {
      console.error('❌ Failed to manage plan-role mapping:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// List mappings command
discordCommand
  .command('mappings')
  .description('List all plan-role mappings')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
       const mappings = await configManager.listPlanRoleMappings();
       const plansResult = await mockApi.listPlans();
       
       if (!plansResult.success || !plansResult.data) {
         console.log('❌ Failed to fetch plans');
         return;
       }
       
       const plans = plansResult.data;

      if (options.json) {
        console.log(JSON.stringify(mappings, null, 2));
        return;
      }

      console.log('📋 Plan-Role Mappings:\n');
      
      if (Object.keys(mappings).length === 0) {
        console.log('   No mappings configured');
        console.log('   Use: billing discord map');
        return;
      }

      for (const [planId, mapping] of Object.entries(mappings)) {
        const plan = plans.find(p => p.id === planId);
        console.log(`📦 Plan: ${plan?.name || planId}`);
        console.log(`   ID: ${planId}`);
        console.log(`   Price: $${plan?.price}/${plan?.interval}`);
        console.log(`🎭 Role: ${mapping.roleName}`);
        console.log(`   ID: ${mapping.roleId}`);
        console.log('');
      }

    } catch (error) {
      console.error('❌ Failed to list mappings:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Test Discord connection
discordCommand
  .command('test')
  .description('Test Discord connection and permissions')
  .action(async () => {
    try {
      console.log('🔍 Testing Discord connection...\n');

      const config = await configManager.loadConfig();
      if (!config) {
        console.log('❌ No Discord configuration found. Run "billing discord config" first.');
        return;
      }
      const roleManager = new DiscordRoleManager(config);
      
      console.log('🔌 Connecting to Discord...');
      await roleManager.connect();
      
      console.log('✅ Connected! Testing permissions...');
      const testResult = await roleManager.testConnection();
      
      if (testResult.success) {
        console.log('\n✅ Discord connection test successful!');
        console.log('\n📋 Connection Details:');
        console.log(`   Bot User: ${testResult.details?.botUser}`);
        console.log(`   Guild: ${testResult.details?.guildName}`);
        console.log(`   Members: ${testResult.details?.memberCount}`);
        console.log(`   Permissions: ${testResult.details?.permissions.join(', ')}`);
        
        // Test role listing
        console.log('\n🎭 Available Roles:');
        const rolesResult = await roleManager.listGuildRoles();
        if (rolesResult.success && rolesResult.roles) {
          rolesResult.roles.slice(0, 5).forEach(role => {
            console.log(`   ${role.name} (${role.memberCount} members)${role.planId ? ` → ${role.planId}` : ''}`);
          });
          
          if (rolesResult.roles.length > 5) {
            console.log(`   ... and ${rolesResult.roles.length - 5} more roles`);
          }
        }
      } else {
        console.log(`❌ Connection test failed: ${testResult.message}`);
      }
      
      await roleManager.disconnect();

    } catch (error) {
      console.error('❌ Discord test failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Start webhook listener
discordCommand
  .command('listen')
  .description('Start Discord webhook listener')
  .option('--port <port>', 'Port to listen on', '3001')
  .option('--path <path>', 'Webhook endpoint path', '/webhook')
  .action(async (options) => {
    try {
      console.log('🎧 Starting Discord webhook listener...\n');

      const config = await configManager.loadConfig();
      
      if (!config) {
        console.log('❌ No Discord configuration found. Run "billing discord config" first.');
        return;
      }
      
      const listenerConfig = {
        port: parseInt(options.port),
        path: options.path,
        secret: config.webhookSecret || 'default-secret'
      };

      const listener = new DiscordWebhookListener(listenerConfig);
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down webhook listener...');
        await listener.stop();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.log('\n🛑 Shutting down webhook listener...');
        await listener.stop();
        process.exit(0);
      });

      await listener.start();
      
      console.log('✅ Discord webhook listener is running!');
      console.log('\n📋 Listener Details:');
      console.log(`   Port: ${listenerConfig.port}`);
      console.log(`   Webhook URL: http://localhost:${listenerConfig.port}${listenerConfig.path}`);
      console.log(`   Health Check: http://localhost:${listenerConfig.port}/health`);
      console.log('\n💡 Supported Events:');
      console.log('   • invoice.paid → Grant Discord role');
      console.log('   • subscription.expired → Revoke Discord role');
      console.log('   • refund.completed → Revoke Discord role');
      console.log('   • subscription.cancelled → Revoke Discord role');
      console.log('\n🔄 Press Ctrl+C to stop the listener');

      // Keep the process running
      await new Promise(() => {});

    } catch (error) {
      console.error('❌ Failed to start webhook listener:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Remove mapping command
discordCommand
  .command('unmap')
  .description('Remove plan-role mapping')
  .option('--plan-id <id>', 'Plan ID to unmap')
  .action(async (options) => {
    try {
      const mappings = await configManager.listPlanRoleMappings();
      const plansResult = await mockApi.listPlans();

      if (!plansResult.success || !plansResult.data) {
        console.log('❌ Failed to fetch plans');
        return;
      }
      
      const plans = plansResult.data;
      if (Object.keys(mappings).length === 0) {
        console.log('❌ No mappings configured');
        return;
      }

      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'planId',
          message: 'Select plan to unmap:',
          choices: Object.keys(mappings).map(planId => {
            const plan = plans.find((p: any) => p.id === planId);
            const mapping = mappings[planId];
            return {
              name: `${plan?.name || planId} → ${mapping.roleName}`,
              value: planId
            };
          }),
          when: !options.planId
        }
      ]);

      const planId = options.planId || answers.planId;
      await configManager.removePlanRoleMapping(planId);

      console.log(`✅ Removed mapping for plan: ${planId}`);

    } catch (error) {
      console.error('❌ Failed to remove mapping:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });