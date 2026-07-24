import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env';
import type { INotificationSender, NotificationSendParams } from '../types';

export class EmailNotificationSender implements INotificationSender {
  readonly channel = 'EMAIL' as const;
  private transporter: Transporter | null = null;

  isConfigured(): boolean {
    return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      });
    }
    return this.transporter;
  }

  async send(target: string, params: NotificationSendParams): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Email sender invoked without SMTP configuration');
    }
    await this.getTransporter().sendMail({
      from: env.SMTP_FROM,
      to: target,
      subject: params.title,
      text: params.message,
    });
  }
}
