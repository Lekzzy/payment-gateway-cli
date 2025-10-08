import { Router, Request, Response } from 'express';
import { WebhookVerifier } from '../../utils/webhook';
import { ConfigManager } from '../../utils/config';
import { DiscordWebhookListener } from '../../discord/webhook-listener';
import { TelegramWebhookListener } from '../../telegram/webhook-listener';
import { WebhookEvent } from '../../types/index';

// Lazy singletons for listeners
let discordListener: DiscordWebhookListener | null = null;
let telegramListener: TelegramWebhookListener | null = null;

function getDiscordListener(secret: string) {
  if (!discordListener) {
    discordListener = new DiscordWebhookListener({
      port: 0,
      path: '/noop',
      secret,
      offline: true
    } as any);
  }
  return discordListener;
}

function getTelegramListener() {
  if (!telegramListener) {
    telegramListener = new TelegramWebhookListener();
  }
  return telegramListener;
}

export default function createWebhooksRouter(webhookSecret: string) {
  const router = Router();
  const verifier = new WebhookVerifier(webhookSecret);
  const cfgManager = new ConfigManager();

  // Raw body capture for signature verification
  router.post('/webhooks', async (
    req: Request,
    res: Response,
  ) => {
    // Use express.raw at mount time; here payload may already be parsed.
    // Ensure we reconstruct payload for verification.
    try {
      // API key authentication
      const authHeader = (req.headers['authorization'] as string) || '';
      const headerApiKey = (req.headers['x-api-key'] as string) || '';
      const envApiKey = process.env.API_KEY || '';
      let cliApiKey = '';
      try {
        const cfg = await cfgManager.loadConfig();
        cliApiKey = cfg?.apiKey || '';
      } catch {}

      // Extract token from Authorization header if present
      const token = authHeader
        ? (authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader.startsWith('ApiKey ')
              ? authHeader.slice(7)
              : authHeader)
        : headerApiKey;

      const expectedKey = cliApiKey || envApiKey;
      // Enforce API key only if configured
      if (expectedKey && token !== expectedKey) {
        return res.status(401).json({ success: false, error: 'Unauthorized: invalid API key' });
      }
      const signature = (
        (req.headers['x-webhook-signature'] as string) ||
        (req.headers['x-billing-signature'] as string) ||
        (req.headers['x-signature'] as string)
      );
      const timestamp = (
        (req.headers['x-webhook-timestamp'] as string) ||
        (req.headers['x-billing-timestamp'] as string) ||
        (req.headers['x-timestamp'] as string)
      );

      if (!signature || !timestamp) {
        return res.status(400).json({ success: false, error: 'Missing webhook headers' });
      }

      // Prefer raw body if available via middleware; otherwise reconstruct
      const payload = Buffer.isBuffer((req as any).rawBody)
        ? (req as any).rawBody.toString('utf8')
        : (typeof (req as any).body === 'string'
            ? (req as any).body
            : JSON.stringify((req as any).body || {}));

      // Flexible verification: support signatures with and without timestamp
      let verification = verifier.verifyWebhook(payload, signature, timestamp);
      if (!verification.isValid) {
        // Try without timestamp for legacy clients
        const ok = verifier.verifySignature(payload, signature);
        if (!ok) {
          return res.status(401).json({ success: false, error: verification.error || 'Invalid signature' });
        }
        // Build event from body if verifyWebhook failed
        verification = { isValid: true, event: JSON.parse(payload) } as any;
      }

      // Normalize event shape: accept both { type, data } and { event, data }
      let event: WebhookEvent;
      let bodyObj: any;
      try {
        bodyObj = JSON.parse(payload);
      } catch {
        bodyObj = (req as any).body || {};
      }
      const eventType = bodyObj?.type || bodyObj?.event || 'unknown';
      event = {
        id: bodyObj?.id || `evt_${Date.now()}`,
        type: eventType,
        data: bodyObj?.data || bodyObj || {},
        timestamp: new Date(bodyObj?.timestamp || Date.now()),
        signature,
      } as WebhookEvent;

      // Dispatch to Telegram
      const telegram = getTelegramListener();
      telegram.handleEvent({ type: event.type, data: event.data }).catch((e) => {
        console.warn('Telegram dispatch error:', e instanceof Error ? e.message : e);
      });

      // Dispatch to Discord via its handler
      const discord = getDiscordListener(webhookSecret);
      // Prefer public handleEvent if available
      (discord as any).handleEvent(event)
        .then((result: any) => {
          return res.status(200).json({
            success: true,
            event_processed: {
              event: bodyObj?.event || event.type,
              invoice_id: bodyObj?.data?.invoice_id || event.data?.invoice?.id || null,
            },
            discord: result,
          });
        })
        .catch((err: any) => {
          console.warn('Discord dispatch error:', err instanceof Error ? err.message : err);
          return res.status(200).json({
            success: true,
            event_processed: {
              event: bodyObj?.event || event.type,
              invoice_id: bodyObj?.data?.invoice_id || event.data?.invoice?.id || null,
            },
            discord: { success: false, message: 'Dispatch failed' },
          });
        });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Webhook processing failed' });
    }
  });

  return router;
}