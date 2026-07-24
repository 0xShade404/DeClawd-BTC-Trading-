import webpush from 'web-push';
import { env } from '../../config/env';
import type { INotificationSender, NotificationSendParams } from '../types';

let vapidConfigured = false;

function ensureVapidConfigured(): void {
  if (vapidConfigured || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;
  webpush.setVapidDetails('mailto:support@declawd.app', env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  vapidConfigured = true;
}

/**
 * Browser push sender using the Web Push protocol. `target` is the
 * JSON-serialized PushSubscription object obtained client-side from
 * `PushManager.subscribe()` and stored as NotificationPreference.target.
 */
export class PushNotificationSender implements INotificationSender {
  readonly channel = 'BROWSER_PUSH' as const;

  isConfigured(): boolean {
    return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  }

  async send(target: string, params: NotificationSendParams): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Push sender invoked without VAPID keys configured');
    }
    ensureVapidConfigured();

    let subscription: webpush.PushSubscription;
    try {
      subscription = JSON.parse(target) as webpush.PushSubscription;
    } catch {
      throw new Error('Push notification target is not a valid PushSubscription JSON payload');
    }

    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title: params.title, body: params.message, metadata: params.metadata }),
    );
  }
}
