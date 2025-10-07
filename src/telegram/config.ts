import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { TelegramConfig } from '../types/index';

export class TelegramConfigManager {
  private configPath: string;
  private defaultConfig: TelegramConfig;

  constructor() {
    const configDir = path.join(os.homedir(), '.billing-cli');
    this.configPath = path.join(configDir, 'telegram-config.json');
    this.defaultConfig = {
      botToken: '',
      adminChatId: '',
      planGroupMapping: {},
      webhookSecret: '',
      retryAttempts: 3,
      retryDelay: 1000,
      logLevel: 'info'
    };
  }

  async loadConfig(): Promise<TelegramConfig | null> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configData) as TelegramConfig;

      if (!config.botToken || !config.adminChatId) {
        throw new Error('Bot token and admin chat ID are required');
      }

      return { ...this.defaultConfig, ...config };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new Error(`Failed to load Telegram config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveConfig(config: TelegramConfig): Promise<void> {
    try {
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      this.validateConfig(config);
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save Telegram config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateConfig(updates: Partial<TelegramConfig>): Promise<TelegramConfig> {
    const current = (await this.loadConfig()) || this.defaultConfig;
    const next = { ...current, ...updates };
    await this.saveConfig(next);
    return next;
  }

  async addPlanGroupMapping(planId: string, chatId: string, title?: string): Promise<void> {
    const config = (await this.loadConfig()) || this.defaultConfig;
    config.planGroupMapping[planId] = { chatId, title: title || `Plan ${planId}`, createdAt: new Date() };
    await this.saveConfig(config);
  }

  async removePlanGroupMapping(planId: string): Promise<void> {
    const config = (await this.loadConfig()) || this.defaultConfig;
    if (config.planGroupMapping[planId]) {
      delete config.planGroupMapping[planId];
      await this.saveConfig(config);
    }
  }

  async getGroupForPlan(planId: string): Promise<string | null> {
    const config = await this.loadConfig();
    return config?.planGroupMapping[planId]?.chatId || null;
  }

  async listPlanGroupMappings(): Promise<Record<string, { chatId: string; title?: string; createdAt?: Date }>> {
    const config = await this.loadConfig();
    return config?.planGroupMapping || {};
  }

  private validateConfig(config: TelegramConfig): void {
    if (!config.botToken) {
      throw new Error('Bot token is required');
    }

    if (!config.adminChatId) {
      throw new Error('Admin chat ID is required');
    }

    if (config.retryAttempts !== undefined && (config.retryAttempts < 0 || config.retryAttempts > 10)) {
      throw new Error('Retry attempts must be between 0 and 10');
    }

    if (config.retryDelay !== undefined && (config.retryDelay < 100 || config.retryDelay > 60000)) {
      throw new Error('Retry delay must be between 100ms and 60s');
    }

    for (const [planId, mapping] of Object.entries(config.planGroupMapping)) {
      if (!mapping.chatId) {
        throw new Error(`Invalid chat ID for plan ${planId}`);
      }
    }
  }

  async configExists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  async deleteConfig(): Promise<void> {
    try {
      await fs.unlink(this.configPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to delete Telegram config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  getConfigPath(): string {
    return this.configPath;
  }

  async exportConfig(): Promise<string> {
    const config = await this.loadConfig();
    if (!config) {
      throw new Error('No configuration to export');
    }
    const exportConfig = { ...config, botToken: '[REDACTED]', webhookSecret: '[REDACTED]' };
    return JSON.stringify(exportConfig, null, 2);
  }

  async importConfig(configJson: string, botToken: string, webhookSecret?: string): Promise<void> {
    try {
      const config = JSON.parse(configJson) as TelegramConfig;
      config.botToken = botToken;
      if (webhookSecret) config.webhookSecret = webhookSecret;
      await this.saveConfig(config);
    } catch (error) {
      throw new Error(`Failed to import Telegram config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}