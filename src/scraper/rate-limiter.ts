export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
  minDelayMs: number;
}

export class RateLimiter {
  private timestamps: number[] = [];
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  canProceed(): boolean {
    this.pruneOld();
    return this.timestamps.length < this.config.maxRequests;
  }

  recordRequest(): void {
    this.timestamps.push(Date.now());
  }

  getDelayFromHeaders(headers: Record<string, string | undefined>): number {
    const remaining = headers['x-rate-limit-remaining'];
    const reset = headers['x-rate-limit-reset'];

    if (remaining && Number(remaining) > 0) return 0;
    if (!reset) return this.config.minDelayMs;

    const resetMs = Number(reset) * 1000;
    const delay = resetMs - Date.now();
    return Math.max(delay, this.config.minDelayMs);
  }

  async waitForSlot(): Promise<void> {
    this.pruneOld();
    if (this.timestamps.length >= this.config.maxRequests) {
      const oldest = this.timestamps[0]!;
      const waitUntil = oldest + this.config.windowMs;
      const delay = waitUntil - Date.now();
      if (delay > 0) {
        await sleep(delay + jitter());
      }
    }
    await sleep(this.config.minDelayMs + jitter());
  }

  private pruneOld(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.timestamps = this.timestamps.filter((t) => t > cutoff);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(): number {
  return Math.floor(Math.random() * 1000);
}

// Pre-configured limiters per endpoint
export const rateLimiters = {
  userTweets: new RateLimiter({ maxRequests: 50, windowMs: 15 * 60 * 1000, minDelayMs: 2000 }),
  search: new RateLimiter({ maxRequests: 50, windowMs: 15 * 60 * 1000, minDelayMs: 3000 }),
  userProfile: new RateLimiter({ maxRequests: 95, windowMs: 15 * 60 * 1000, minDelayMs: 1000 }),
  trends: new RateLimiter({ maxRequests: 20, windowMs: 15 * 60 * 1000, minDelayMs: 5000 }),
};
