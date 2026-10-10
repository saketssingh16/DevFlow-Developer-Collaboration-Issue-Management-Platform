import pino from 'pino';

const logger = pino({ name: 'email-provider' });

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  sendEmail(options: SendEmailOptions): Promise<boolean>;
}

export class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    logger.info(
      {
        to: options.to,
        subject: options.subject,
        preview: options.text || options.html.substring(0, 100)
      },
      '[DEV EMAIL PROVIDER] Dispatching email'
    );
    return true;
  }
}

export const defaultEmailProvider: EmailProvider = new ConsoleEmailProvider();
