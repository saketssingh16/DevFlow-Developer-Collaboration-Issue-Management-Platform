import { describe, it, expect } from 'vitest';
import { ConsoleEmailProvider } from '../services/console-email.provider.js';

describe('Worker Queue Processors & Email Provider Unit Tests', () => {
  it('ConsoleEmailProvider accepts a development email payload', async () => {
    const provider = new ConsoleEmailProvider();
    await expect(provider.send({
      to: 'test@example.com',
      subject: 'DevFlow Test Email',
      html: '<h1>Welcome to DevFlow</h1>'
    })).resolves.toBeUndefined();
  });
});
