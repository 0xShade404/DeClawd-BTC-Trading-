import { env } from '../../config/env';
import type { INotificationSender, NotificationSendParams } from '../types';

/**
 * Discord sender. `target` is either a channel webhook URL (simplest path,
 * no bot membership required) or a raw channel id, in which case the
 * DISCORD_BOT_TOKEN Bot API is used instead:
 * https://discord.com/developers/docs/resources/channel#create-message
 */
export class DiscordNotificationSender implements INotificationSender {
  readonly channel = 'DISCORD' as const;

  isConfigured(): boolean {
    // A webhook URL alone is enough; the bot token is only needed for the
    // channel-id path, checked per-send since target determines which path applies.
    return true;
  }

  async send(target: string, params: NotificationSendParams): Promise<void> {
    const content = `**${params.title}**\n${params.message}`;

    if (target.startsWith('http')) {
      const res = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Discord webhook post failed: ${res.status} ${body}`);
      }
      return;
    }

    if (!env.DISCORD_BOT_TOKEN) {
      throw new Error('Discord sender invoked with a channel id but DISCORD_BOT_TOKEN is not configured');
    }
    const res = await fetch(`https://discord.com/api/v10/channels/${target}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Discord channel message failed: ${res.status} ${body}`);
    }
  }
}
