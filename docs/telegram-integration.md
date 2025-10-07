# Telegram Integration Guide

This guide walks through setting up the Telegram adapter for automated group access and notifications tied to billing events.

## Prerequisites
- Telegram account
- Node.js 18+
- Billing CLI installed (`npm install -g billing-system-cli`)

## Create a Bot
1. Open Telegram and start a chat with `@BotFather`.
2. Send `/newbot` and follow prompts to name your bot.
3. Copy the bot token (format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`).

## Configure the Adapter
Run the CLI to set up your bot and admin chat:
```bash
billing adapter telegram init
```
- Bot token: paste the token from BotFather
- Admin chat ID: enter a chat ID where admin alerts should be sent
- Webhook secret: optional secret for verifying inbound events

You can map billing plans to Telegram groups or channels. When a user pays for a plan, they receive an invite link to the mapped group; when a subscription expires or a refund occurs, they are removed.

## Finding Chat IDs
- For groups/channels, add your bot to the group and promote it to admin, then use other tooling or bot logs to capture the `chat.id`.
- For a user chat ID, ask the user to start a DM with your bot; capture `message.chat.id` from the webhook update payload.

## Required Bot Permissions
- Add the bot to the target group/channel and promote it to admin.
- Ensure permissions for `Invite users via link`, `Ban members` (to remove), and `Send messages`.

## Webhook Setup
Expose a Telegram webhook to receive updates:
```bash
POST /webhook/telegram
```
In production, set the webhook using Telegram API:
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-app.com/webhook/telegram"}'
```

## System Webhooks
The adapter listens to billing webhooks and performs actions:
- `invoice.paid`: sends invite link to user and notifies admin
- `subscription.expired` / `subscription.cancelled` / `refund.completed`: removes user from group and notifies admin
- `risk.flagged` / `risk.blocked`: sends alert to admin

Ensure your billing system sends events to `/api/v1/webhooks` with proper signature headers; the test server dispatches these to the Telegram listener internally.

## CLI Commands
```bash
# Initialize configuration
billing adapter telegram init

# Test connectivity and simulate user join/leave
billing adapter telegram test --user <chatId> --plan <planId>

# Send notifications
billing adapter telegram notify --admin --text "System alert"
billing adapter telegram notify --plan <planId> --text "Plan update"
billing adapter telegram notify --chat <chatId> --text "Direct message"
```

## Notes and Limitations
- Telegram does not allow bots to directly add users to groups; the adapter creates an invite link and sends it via DM.
- Removing a user uses ban and immediate unban to revoke current access while allowing future rejoin when entitled.
- Make sure your bot remains admin; otherwise operations will fail.

## Troubleshooting
- If messages fail, verify `botToken` is correct and bot is not blocked by the user.
- If invite link creation fails, ensure the bot has permission to create invite links.
- Check logs for webhook processing errors and confirm plan-to-group mappings exist.