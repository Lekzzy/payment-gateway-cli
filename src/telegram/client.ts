import { TelegramConfig } from '../types/index';
import { TelegramConfigManager } from './config';

interface TelegramApiResponse<T = any> {
  ok: boolean;
  result?: T;
  description?: string;
}

export class TelegramAdapter {
  private config: TelegramConfig;
  private configManager: TelegramConfigManager;
  private apiBase: string;

  constructor(config: TelegramConfig) {
    this.config = config;
    this.configManager = new TelegramConfigManager();
    this.apiBase = `https://api.telegram.org/bot${this.config.botToken}`;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const me = await this.apiCall('getMe');
      if (me?.ok) {
        return { success: true, message: `Connected as ${(me.result as any)?.username || 'bot'}` };
      }
      return { success: false, message: me?.description || 'Failed to connect' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async notifyAdmin(text: string): Promise<{ success: boolean; message: string }> {
    try {
      const resp = await this.apiCall('sendMessage', { chat_id: this.config.adminChatId, text });
      return resp?.ok
        ? { success: true, message: 'Admin notified' }
        : { success: false, message: resp?.description || 'Failed to notify admin' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async sendMessage(chatId: string, text: string): Promise<{ success: boolean; message: string }> {
    try {
      const resp = await this.apiCall('sendMessage', { chat_id: chatId, text });
      return resp?.ok
        ? { success: true, message: 'Message sent' }
        : { success: false, message: resp?.description || 'Failed to send message' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async notifyGroupByPlan(planId: string, text: string): Promise<{ success: boolean; message: string }> {
    try {
      const chatId = await this.configManager.getGroupForPlan(planId);
      if (!chatId) {
        return { success: false, message: `No chat mapping for plan ${planId}` };
      }
      return this.sendMessage(chatId, text);
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Add user to group/channel via invite link
  async addUserToPlanGroup(userChatId: string, planId: string): Promise<{ success: boolean; message: string }> {
    try {
      const chatId = await this.configManager.getGroupForPlan(planId);
      if (!chatId) {
        return { success: false, message: `No chat mapping for plan ${planId}` };
      }

      // Telegram requires the bot to be admin; direct add is not supported.
      // Approach: create an invite link and DM user.
      const linkResp = await this.apiCall('createChatInviteLink', { chat_id: chatId, creates_join_request: false });
      if (!linkResp?.ok || !(linkResp.result as any)?.invite_link) {
        return { success: false, message: linkResp?.description || 'Failed to create invite link' };
      }

      const inviteLink = (linkResp.result as any).invite_link as string;
      const dmResp = await this.apiCall('sendMessage', { chat_id: userChatId, text: `Access granted for plan ${planId}. Join using: ${inviteLink}` });
      if (!dmResp?.ok) {
        return { success: false, message: dmResp?.description || 'Failed to send invite DM' };
      }

      return { success: true, message: 'Invite link sent to user' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Remove user from group/channel if possible
  async removeUserFromPlanGroup(userId: string, planId: string): Promise<{ success: boolean; message: string }> {
    try {
      const chatId = await this.configManager.getGroupForPlan(planId);
      if (!chatId) {
        return { success: false, message: `No chat mapping for plan ${planId}` };
      }

      // Bot must have admin rights; kick via ban (unban immediately to allow rejoin later)
      const kickResp = await this.apiCall('banChatMember', { chat_id: chatId, user_id: userId });
      if (!kickResp?.ok) {
        return { success: false, message: kickResp?.description || 'Failed to remove user' };
      }
      const unbanResp = await this.apiCall('unbanChatMember', { chat_id: chatId, user_id: userId, only_if_banned: true });
      if (!unbanResp?.ok) {
        return { success: false, message: unbanResp?.description || 'Failed to unban user' };
      }
      return { success: true, message: 'User removed from group' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async apiCall(method: string, params?: Record<string, any>): Promise<TelegramApiResponse> {
    const url = `${this.apiBase}/${method}`;
    const res = await (globalThis as any).fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: params ? JSON.stringify(params) : undefined
    });
    return res.json();
  }
}