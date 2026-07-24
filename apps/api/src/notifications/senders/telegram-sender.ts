import { env } from '../../config/env';
import type { INotificationSender, NotificationSendParams } from '../types';

/**
 * Telegram Bot API sender. `target` is the destination chat id (the user
 * obtains this by messaging the DeClawd bot and the value is stored as
 * NotificationPreference.target). See
 * https://core.telegram.org/bots/api#sendmessage
 */
export class TelegramNotificationSender implements INotificationSender {
  readonly channel = 'TELEGRAM' as const;

  isConfigured(): boolean {
    return Boolean(env.TELEGRAM_BOT_TOKEN);
  }

  async send(target: string, params: NotificationSendParams): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Telegram sender invoked without TELEGRAM_BOT_TOKEN configured');
    }
    const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: target,
        text: `*${escapeMarkdown(params.title)}*\n${escapeMarkdown(params.message)}`,
        parse_mode: 'MarkdownV2',
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
    }
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (ch) => `\\${ch}`);
}
