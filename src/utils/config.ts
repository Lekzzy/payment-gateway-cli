import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CLIConfig } from '../types/index';

const CONFIG_DIR = path.join(os.homedir(), '.billing-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export class ConfigManager {
  private static instance: ConfigManager;
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private ensureConfigDir(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  async saveConfig(config: CLIConfig): Promise<void> {
    this.ensureConfigDir();
    
    const configData = {
      ...config,
      configPath: CONFIG_FILE,
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2));
  }

  async loadConfig(): Promise<CLIConfig | null> {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }
    
    try {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Error loading config:', error);
      return null;
    }
  }

  async hasConfig(): Promise<boolean> {
    return fs.existsSync(CONFIG_FILE);
  }

  async clearConfig(): Promise<void> {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  }

  getConfigPath(): string {
    return CONFIG_FILE;
  }

  validateConfig(config: any): config is CLIConfig {
    return (
      config &&
      typeof config.apiKey === 'string' &&
      config.apiKey.length > 0 &&
      typeof config.merchantWallet === 'string' &&
      config.merchantWallet.length > 0
    );
  }
}

export const configManager = ConfigManager.getInstance();