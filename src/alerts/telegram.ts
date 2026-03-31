import { Bot } from 'grammy';

export class TelegramAlerter {
  private bot: Bot;
  private chatId: string | null;
  private lastSentAt = 0;
  private sentCount = 0;
  private readonly maxPerMinute = 20;
  private ready: Promise<void>;

  constructor(botToken: string, chatId?: string) {
    this.bot = new Bot(botToken);
    this.chatId = chatId ?? null;

    if (this.chatId) {
      this.ready = Promise.resolve();
    } else {
      // Auto-detect chat ID: wait for the user to send /start or any message
      this.ready = this.detectChatId();
    }
  }

  private detectChatId(): Promise<void> {
    return new Promise((resolve) => {
      console.log('[telegram] No chat ID configured. Send any message to the bot to auto-detect...');

      this.bot.on('message', (ctx) => {
        this.chatId = String(ctx.chat.id);
        console.log(`[telegram] Auto-detected chat ID: ${this.chatId}`);
        resolve();
      });

      this.bot.start();
    });
  }

  async send(message: string): Promise<void> {
    await this.ready;

    if (!this.chatId) {
      console.warn('[telegram] No chat ID available, skipping message');
      return;
    }

    // Rate limit: max 20 messages per minute
    const now = Date.now();
    if (now - this.lastSentAt > 60_000) {
      this.sentCount = 0;
      this.lastSentAt = now;
    }

    if (this.sentCount >= this.maxPerMinute) {
      console.warn('[telegram] Rate limit reached, skipping message');
      return;
    }

    try {
      await this.bot.api.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
      this.sentCount++;
    } catch (err) {
      console.error('[telegram] Failed to send message:', err);
    }
  }
}
