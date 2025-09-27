/**
 * Discord Integration Module
 * 
 * This module provides Discord integration for the billing system,
 * including role management based on billing events.
 */

export { DiscordConfigManager } from './config';
export { DiscordRoleManager } from './client';
export { DiscordWebhookListener } from './webhook-listener';
export type { 
  DiscordConfig
} from '../types/index';

// Re-export types for convenience
export interface DiscordIntegrationOptions {
  botToken: string;
  guildId: string;
  webhookSecret: string;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface WebhookListenerOptions {
  port: number;
  path: string;
  secret: string;
  discordConfig?: string;
}

/**
 * Quick setup function for Discord integration
 */
export async function setupDiscordIntegration(options: DiscordIntegrationOptions) {
  const { DiscordConfigManager } = await import('./config');
  const { DiscordRoleManager } = await import('./client');
  
  const configManager = new DiscordConfigManager();
  
  // Save configuration
  await configManager.saveConfig({
    botToken: options.botToken,
    guildId: options.guildId,
    webhookSecret: options.webhookSecret,
    planRoleMapping: {},
    retryAttempts: options.retryAttempts || 3,
    retryDelay: options.retryDelay || 1000
  });
  
  // Test connection
  const roleManager = new DiscordRoleManager({
    botToken: options.botToken,
    guildId: options.guildId,
    webhookSecret: options.webhookSecret,
    planRoleMapping: {},
    retryAttempts: options.retryAttempts || 3,
    retryDelay: options.retryDelay || 1000
  });
  
  await roleManager.connect();
  const testResult = await roleManager.testConnection();
  await roleManager.disconnect();
  
  return {
    success: testResult.success,
    message: testResult.message,
    details: testResult.details
  };
}

/**
 * Start Discord webhook listener with default configuration
 */
export async function startWebhookListener(options: WebhookListenerOptions) {
  const { DiscordWebhookListener } = await import('./webhook-listener');
  
  const listener = new DiscordWebhookListener(options);
  await listener.start();
  
  return listener;
}