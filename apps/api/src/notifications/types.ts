import type { NotificationChannel } from '@declawd/database';

export interface NotificationSendParams {
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * One implementation per delivery channel. `isConfigured()` must be checked
 * before `send()` - unconfigured senders (missing API keys/SMTP creds) are
 * skipped with a log line rather than thrown, since notification delivery
 * is best-effort and must never block the calling trading/auth flow.
 */
export interface INotificationSender {
  readonly channel: NotificationChannel;
  isConfigured(): boolean;
  send(target: string, params: NotificationSendParams): Promise<void>;
}
