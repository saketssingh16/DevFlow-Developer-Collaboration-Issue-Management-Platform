import { EmailMessage, EmailProvider } from './console-email.provider.js';

interface ResendResponse {
  id?: string;
  message?: string;
}

export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {})
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend rejected email with status ${response.status}: ${body.slice(0, 300)}`);
    }

    await response.json() as ResendResponse;
  }
}
