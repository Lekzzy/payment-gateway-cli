import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { DiscordConfig } from '../types/index';

export class DiscordConfigManager {
  private configPath: string;
  private defaultConfig: DiscordConfig;

  constructor() {
    const configDir = path.join(os.homedir(), '.billing-cli');
    this.configPath = path.join(configDir, 'discord-config.json');
    
    this.defaultConfig = {
      botToken: '',
      guildId: '',
      planRoleMapping: {},
      webhookSecret: '',
      retryAttempts: 3,
      retryDelay: 1000,
      logLevel: 'info'
    };
  }

  /**
   * Load Discord configuration
   */
  async loadConfig(): Promise<DiscordConfig | null> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configData) as DiscordConfig;
      
      // Validate required fields
      if (!config.botToken || !config.guildId) {
        throw new Error('Bot token and guild ID are required');
      }
      
      return {
        ...this.defaultConfig,
        ...config
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // Config file doesn't exist
      }
      throw new Error(`Failed to load Discord config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save Discord configuration
   */
  async saveConfig(config: DiscordConfig): Promise<void> {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      // Validate configuration
      this.validateConfig(config);

      // Save configuration
      await fs.writeFile(
        this.configPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );
    } catch (error) {
      throw new Error(`Failed to save Discord config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update Discord configuration
   */
  async updateConfig(updates: Partial<DiscordConfig>): Promise<DiscordConfig> {
    const currentConfig = await this.loadConfig() || this.defaultConfig;
    const newConfig = { ...currentConfig, ...updates };
    
    await this.saveConfig(newConfig);
    return newConfig;
  }

  /**
   * Add plan-to-role mapping
   */
  async addPlanRoleMapping(planId: string, roleId: string, roleName?: string): Promise<void> {
    const config = await this.loadConfig() || this.defaultConfig;
    
    config.planRoleMapping[planId] = {
      roleId,
      roleName: roleName || `Plan ${planId}`,
      createdAt: new Date()
    };
    
    await this.saveConfig(config);
  }

  /**
   * Remove plan-to-role mapping
   */
  async removePlanRoleMapping(planId: string): Promise<void> {
    const config = await this.loadConfig() || this.defaultConfig;
    
    if (config.planRoleMapping[planId]) {
      delete config.planRoleMapping[planId];
      await this.saveConfig(config);
    }
  }

  /**
   * Get role ID for a plan
   */
  async getRoleForPlan(planId: string): Promise<string | null> {
    const config = await this.loadConfig();
    return config?.planRoleMapping[planId]?.roleId || null;
  }

  /**
   * List all plan-role mappings
   */
  async listPlanRoleMappings(): Promise<Record<string, { roleId: string; roleName?: string; createdAt?: Date }>> {
    const config = await this.loadConfig();
    return config?.planRoleMapping || {};
  }

  /**
   * Validate Discord configuration
   */
  private validateConfig(config: DiscordConfig): void {
    if (!config.botToken) {
      throw new Error('Bot token is required');
    }

    if (!config.botToken.startsWith('Bot ') && !config.botToken.includes('.')) {
      throw new Error('Invalid bot token format');
    }

    if (!config.guildId) {
      throw new Error('Guild ID is required');
    }

    if (!/^\d+$/.test(config.guildId)) {
      throw new Error('Guild ID must be a valid Discord snowflake');
    }

    if (config.retryAttempts !== undefined && (config.retryAttempts < 0 || config.retryAttempts > 10)) {
      throw new Error('Retry attempts must be between 0 and 10');
    }

    if (config.retryDelay !== undefined && (config.retryDelay < 100 || config.retryDelay > 60000)) {
      throw new Error('Retry delay must be between 100ms and 60s');
    }

    // Validate plan role mappings
    for (const [planId, mapping] of Object.entries(config.planRoleMapping)) {
      if (!mapping.roleId || !/^\d+$/.test(mapping.roleId)) {
        throw new Error(`Invalid role ID for plan ${planId}`);
      }
    }
  }

  /**
   * Check if configuration exists
   */
  async configExists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete configuration
   */
  async deleteConfig(): Promise<void> {
    try {
      await fs.unlink(this.configPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to delete Discord config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Get configuration file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Export configuration for backup
   */
  async exportConfig(): Promise<string> {
    const config = await this.loadConfig();
    if (!config) {
      throw new Error('No configuration to export');
    }

    // Remove sensitive data for export
    const exportConfig = {
      ...config,
      botToken: '[REDACTED]',
      webhookSecret: '[REDACTED]'
    };

    return JSON.stringify(exportConfig, null, 2);
  }

  /**
   * Import configuration from backup
   */
  async importConfig(configJson: string, botToken: string, webhookSecret?: string): Promise<void> {
    try {
      const config = JSON.parse(configJson) as DiscordConfig;
      
      // Restore sensitive data
      config.botToken = botToken;
      if (webhookSecret) {
        config.webhookSecret = webhookSecret;
      }

      await this.saveConfig(config);
    } catch (error) {
      throw new Error(`Failed to import Discord config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}