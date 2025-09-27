import { Client, GatewayIntentBits, Guild, GuildMember, Role } from 'discord.js';
import { DiscordConfig } from '../types/index';
import { DiscordConfigManager } from './config';

export class DiscordRoleManager {
  private client: Client;
  private config: DiscordConfig;
  private configManager: DiscordConfigManager;
  private guild: Guild | null = null;
  private isReady: boolean = false;

  constructor(config: DiscordConfig) {
    this.config = config;
    this.configManager = new DiscordConfigManager();
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
      ]
    });

    this.setupEventHandlers();
  }

  /**
   * Set up Discord client event handlers
   */
  private setupEventHandlers(): void {
    this.client.on('ready', async () => {
      console.log(`Discord bot logged in as ${this.client.user?.tag}`);
      
      try {
        this.guild = await this.client.guilds.fetch(this.config.guildId);
        this.isReady = true;
        console.log(`Connected to guild: ${this.guild.name}`);
      } catch (error) {
        console.error('Failed to fetch guild:', error);
      }
    });

    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
    });

    this.client.on('disconnect', () => {
      console.log('Discord client disconnected');
      this.isReady = false;
    });
  }

  /**
   * Initialize and connect to Discord
   */
  async connect(): Promise<void> {
    try {
      await this.client.login(this.config.botToken);
      
      // Wait for ready state
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Discord connection timeout'));
        }, 30000);

        const checkReady = () => {
          if (this.isReady) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };

        checkReady();
      });
    } catch (error) {
      throw new Error(`Failed to connect to Discord: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disconnect from Discord
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
    }
  }

  /**
   * Grant role to user based on plan
   */
  async grantRole(userId: string, planId: string): Promise<{
    success: boolean;
    message: string;
    roleId?: string;
    roleName?: string;
  }> {
    try {
      if (!this.isReady || !this.guild) {
        throw new Error('Discord client not ready');
      }

      // Get role ID for plan
      const roleId = await this.configManager.getRoleForPlan(planId);
      if (!roleId) {
        return {
          success: false,
          message: `No role mapping found for plan: ${planId}`
        };
      }

      // Fetch role and member
      const role = await this.guild.roles.fetch(roleId);
      if (!role) {
        return {
          success: false,
          message: `Role not found: ${roleId}`
        };
      }

      const member = await this.guild.members.fetch(userId);
      if (!member) {
        return {
          success: false,
          message: `User not found in guild: ${userId}`
        };
      }

      // Check if user already has the role
      if (member.roles.cache.has(roleId)) {
        return {
          success: true,
          message: `User already has role: ${role.name}`,
          roleId,
          roleName: role.name
        };
      }

      // Grant role with retry logic
      await this.retryOperation(async () => {
        await member.roles.add(role, `Billing: Plan ${planId} activated`);
      });

      return {
        success: true,
        message: `Role granted: ${role.name}`,
        roleId,
        roleName: role.name
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to grant role: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Revoke role from user based on plan
   */
  async revokeRole(userId: string, planId: string): Promise<{
    success: boolean;
    message: string;
    roleId?: string;
    roleName?: string;
  }> {
    try {
      if (!this.isReady || !this.guild) {
        throw new Error('Discord client not ready');
      }

      // Get role ID for plan
      const roleId = await this.configManager.getRoleForPlan(planId);
      if (!roleId) {
        return {
          success: false,
          message: `No role mapping found for plan: ${planId}`
        };
      }

      // Fetch role and member
      const role = await this.guild.roles.fetch(roleId);
      if (!role) {
        return {
          success: false,
          message: `Role not found: ${roleId}`
        };
      }

      const member = await this.guild.members.fetch(userId);
      if (!member) {
        return {
          success: false,
          message: `User not found in guild: ${userId}`
        };
      }

      // Check if user has the role
      if (!member.roles.cache.has(roleId)) {
        return {
          success: true,
          message: `User doesn't have role: ${role.name}`,
          roleId,
          roleName: role.name
        };
      }

      // Revoke role with retry logic
      await this.retryOperation(async () => {
        await member.roles.remove(role, `Billing: Plan ${planId} deactivated`);
      });

      return {
        success: true,
        message: `Role revoked: ${role.name}`,
        roleId,
        roleName: role.name
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to revoke role: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get user's current roles
   */
  async getUserRoles(userId: string): Promise<{
    success: boolean;
    roles?: Array<{ id: string; name: string; planId?: string }>;
    message?: string;
  }> {
    try {
      if (!this.isReady || !this.guild) {
        throw new Error('Discord client not ready');
      }

      const member = await this.guild.members.fetch(userId);
      if (!member) {
        return {
          success: false,
          message: `User not found in guild: ${userId}`
        };
      }

      // Get plan role mappings
      const planMappings = await this.configManager.listPlanRoleMappings();
      const roleToPlans = new Map<string, string>();
      
      for (const [planId, mapping] of Object.entries(planMappings)) {
        roleToPlans.set(mapping.roleId, planId);
      }

      // Map user roles
      const roles = member.roles.cache
        .filter(role => role.id !== this.guild!.id) // Exclude @everyone role
        .map(role => ({
          id: role.id,
          name: role.name,
          planId: roleToPlans.get(role.id)
        }));

      return {
        success: true,
        roles: Array.from(roles.values())
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get user roles: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if user has specific plan role
   */
  async hasRole(userId: string, planId: string): Promise<{
    success: boolean;
    hasRole?: boolean;
    message?: string;
  }> {
    try {
      const roleId = await this.configManager.getRoleForPlan(planId);
      if (!roleId) {
        return {
          success: false,
          message: `No role mapping found for plan: ${planId}`
        };
      }

      if (!this.isReady || !this.guild) {
        throw new Error('Discord client not ready');
      }

      const member = await this.guild.members.fetch(userId);
      if (!member) {
        return {
          success: false,
          message: `User not found in guild: ${userId}`
        };
      }

      return {
        success: true,
        hasRole: member.roles.cache.has(roleId)
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to check user role: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * List all available roles in the guild
   */
  async listGuildRoles(): Promise<{
    success: boolean;
    roles?: Array<{ id: string; name: string; memberCount: number; planId?: string }>;
    message?: string;
  }> {
    try {
      if (!this.isReady || !this.guild) {
        throw new Error('Discord client not ready');
      }

      // Get plan role mappings
      const planMappings = await this.configManager.listPlanRoleMappings();
      const roleToPlans = new Map<string, string>();
      
      for (const [planId, mapping] of Object.entries(planMappings)) {
        roleToPlans.set(mapping.roleId, planId);
      }

      // Fetch all roles
      const roles = await this.guild.roles.fetch();
      
      const roleList = roles
        .filter(role => role.id !== this.guild!.id) // Exclude @everyone role
        .map(role => ({
          id: role.id,
          name: role.name,
          memberCount: role.members.size,
          planId: roleToPlans.get(role.id)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        success: true,
        roles: roleList
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list guild roles: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test Discord connection and permissions
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: {
      botUser: string;
      guildName: string;
      memberCount: number;
      permissions: string[];
    };
  }> {
    try {
      if (!this.isReady || !this.guild) {
        throw new Error('Discord client not ready');
      }

      // Get bot member to check permissions
      const botMember = await this.guild.members.fetch(this.client.user!.id);
      const permissions = botMember.permissions.toArray();

      return {
        success: true,
        message: 'Discord connection successful',
        details: {
          botUser: this.client.user!.tag,
          guildName: this.guild.name,
          memberCount: this.guild.memberCount,
          permissions
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Discord connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    const maxAttempts = this.config.retryAttempts || 3;
    const baseDelay = this.config.retryDelay || 1000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxAttempts - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.isReady && this.client.isReady();
  }

  /**
   * Get guild information
   */
  getGuildInfo(): { id: string; name: string; memberCount: number } | null {
    if (!this.guild) return null;
    
    return {
      id: this.guild.id,
      name: this.guild.name,
      memberCount: this.guild.memberCount
    };
  }
}