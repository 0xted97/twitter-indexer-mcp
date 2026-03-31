import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateLimiter } from '../src/scraper/rate-limiter.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 15 * 60 * 1000, // 15 minutes
      minDelayMs: 100,
    });
  });

  it('allows requests under the limit', async () => {
    const canProceed = limiter.canProceed();
    expect(canProceed).toBe(true);
  });

  it('tracks request count', () => {
    limiter.recordRequest();
    limiter.recordRequest();
    limiter.recordRequest();
    expect(limiter.canProceed()).toBe(false);
  });

  it('calculates delay from rate limit headers', () => {
    const resetTime = Math.floor(Date.now() / 1000) + 60; // 60 seconds from now
    const delay = limiter.getDelayFromHeaders({
      'x-rate-limit-remaining': '0',
      'x-rate-limit-reset': String(resetTime),
    });
    expect(delay).toBeGreaterThan(50000);
    expect(delay).toBeLessThanOrEqual(61000);
  });

  it('returns 0 delay when remaining > 0', () => {
    const delay = limiter.getDelayFromHeaders({
      'x-rate-limit-remaining': '10',
      'x-rate-limit-reset': String(Math.floor(Date.now() / 1000) + 60),
    });
    expect(delay).toBe(0);
  });
});
