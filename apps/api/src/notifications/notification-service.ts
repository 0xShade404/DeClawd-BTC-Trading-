import type { NotificationEvent, Prisma, PrismaClient } from '@declawd/database';
import {
  NOTIFICATION_LARGE_LOSS_THRESHOLD_USD,
  NOTIFICATION_LARGE_PROFIT_THRESHOLD_USD,
} from '@declawd/shared';
import type { INotificationSender, NotificationSendParams } from './types';
import { EmailNotificationSender } from './senders/email-sender';
import { TelegramNotificationSender } from './senders/telegram-sender';
import { DiscordNotificationSender } from './senders/discord-sender';
import { PushNotificationSender } from './senders/push-sender';

export interface NotifyParams extends NotificationSendParams {
  userId: string;
  event: NotificationEvent;
}

/**
 * Fans a notification event out to every channel the user has enabled for
 * that event, per their NotificationPreference rows. Delivery is
 * independent per channel - one failing channel never blocks the others -
 * and every attempt (success or failure) is recorded in NotificationLog.
 */
export class NotificationService {
  private readonly senders: INotificationSender[];

  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger?: { warn: (msg: string, meta?: object) => void; error: (msg: string, meta?: object) => void },
    senders?: INotificationSender[],
  ) {
    this.senders = senders ?? [
      new EmailNotificationSender(),
      new TelegramNotificationSender(),
      new DiscordNotificationSender(),
      new PushNotificationSender(),
    ];
  }

  async notify(params: NotifyParams): Promise<void> {
    const prefs = await this.prisma.notificationPreference.findMany({
      where: { userId: params.userId, event: params.event, enabled: true },
    });

    if (prefs.length === 0) return;

    const user = await this.prisma.user.findUnique({ where: { id: params.userId } });

    await Promise.all(
      prefs.map(async (pref) => {
        const sender = this.senders.find((s) => s.channel === pref.channel);
        if (!sender) return;

        const target = pref.target ?? (pref.channel === 'EMAIL' ? user?.email : null);
        if (!target) {
          this.logger?.warn(`No delivery target for ${pref.channel}/${params.event}, skipping`, {
            userId: params.userId,
          });
          return;
        }

        if (!sender.isConfigured()) {
          this.logger?.warn(`${pref.channel} sender is not configured, skipping notification`, {
            userId: params.userId,
            event: params.event,
          });
          return;
        }

        try {
          await sender.send(target, { title: params.title, message: params.message, metadata: params.metadata });
          await this.prisma.notificationLog.create({
            data: {
              userId: params.userId,
              channel: pref.channel,
              event: params.event,
              payload: { title: params.title, message: params.message, metadata: params.metadata ?? {} } as Prisma.InputJsonValue,
              sentAt: new Date(),
            },
          });
        } catch (err) {
          this.logger?.error(`Failed to send ${pref.channel} notification`, { error: String(err) });
          await this.prisma.notificationLog.create({
            data: {
              userId: params.userId,
              channel: pref.channel,
              event: params.event,
              payload: { title: params.title, message: params.message, metadata: params.metadata ?? {} } as Prisma.InputJsonValue,
              error: String(err),
            },
          });
        }
      }),
    );
  }

  /** Convenience helper - decides LARGE_PROFIT vs regular TRADE_CLOSED based on the configured threshold. */
  async notifyTradeClosed(userId: string, marketQuestion: string, pnlUsd: number): Promise<void> {
    const isLargeProfit = pnlUsd >= NOTIFICATION_LARGE_PROFIT_THRESHOLD_USD;
    const isLargeLoss = pnlUsd <= -NOTIFICATION_LARGE_LOSS_THRESHOLD_USD;

    await this.notify({
      userId,
      event: 'TRADE_CLOSED',
      title: 'Position closed',
      message: `"${marketQuestion}" closed with ${pnlUsd >= 0 ? 'a profit' : 'a loss'} of $${Math.abs(pnlUsd).toFixed(2)}.`,
      metadata: { marketQuestion, pnlUsd },
    });

    if (isLargeProfit) {
      await this.notify({
        userId,
        event: 'LARGE_PROFIT',
        title: 'Large profit!',
        message: `"${marketQuestion}" earned $${pnlUsd.toFixed(2)}.`,
        metadata: { marketQuestion, pnlUsd },
      });
    } else if (isLargeLoss) {
      await this.notify({
        userId,
        event: 'LARGE_LOSS',
        title: 'Large loss',
        message: `"${marketQuestion}" lost $${Math.abs(pnlUsd).toFixed(2)}.`,
        metadata: { marketQuestion, pnlUsd },
      });
    }
  }
}
