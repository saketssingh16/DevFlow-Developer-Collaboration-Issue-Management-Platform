import pino from 'pino';

const logger = pino({ name: 'worker:email-provider' });

export interface EmailMessage { to: string; subject: string; html: string; text?: string; }
export interface EmailProvider { send(message: EmailMessage): Promise<void>; }

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    logger.info({ to: message.to, subject: message.subject, preview: message.text || message.html.slice(0, 100) }, 'Development email dispatched');
  }
}
