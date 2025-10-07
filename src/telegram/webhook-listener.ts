import { TelegramConfigManager } from './config';
import { TelegramAdapter } from './client';

export class TelegramWebhookListener {
  private adapter: TelegramAdapter | null = null;

  async init(): Promise<void> {
    const cfgManager = new TelegramConfigManager();
    const config = await cfgManager.loadConfig();
    if (!config) throw new Error('Telegram config not found');
    this.adapter = new TelegramAdapter(config);
  }

  async handleEvent(event: { type: string; data: any }): Promise<void> {
    if (!this.adapter) await this.init();
    const adapter = this.adapter!;

    switch (event.type) {
      case 'invoice.paid': {
        const planId = event.data?.invoice?.planId || event.data?.plan?.id;
        const userChatId = event.data?.customer?.telegramChatId || event.data?.invoice?.metadata?.telegramChatId;
        if (planId && userChatId) {
          await adapter.addUserToPlanGroup(userChatId, planId);
          await adapter.notifyAdmin(`User ${userChatId} granted access for plan ${planId}`);
        }
        break;
      }
      case 'subscription.expired':
      case 'refund.completed':
      case 'subscription.cancelled': {
        const planId = event.data?.invoice?.planId || event.data?.plan?.id;
        const userId = event.data?.customer?.telegramUserId || event.data?.invoice?.metadata?.telegramUserId;
        if (planId && userId) {
          await adapter.removeUserFromPlanGroup(userId, planId);
          await adapter.notifyAdmin(`User ${userId} removed for plan ${planId} due to ${event.type}`);
        }
        break;
      }
      case 'risk.flagged':
      case 'risk.blocked': {
        const details = JSON.stringify(event.data || {});
        await adapter.notifyAdmin(`Risk event: ${event.type} ${details}`);
        break;
      }
      default:
        // ignore
        break;
    }
  }
}