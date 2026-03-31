import { describe, it, expect } from 'vitest';
import {
  buildTweetSearchQuery,
  buildPaginationParams,
} from '../src/db/queries.js';

describe('query builders', () => {
  it('builds pagination params with defaults', () => {
    const params = buildPaginationParams({});
    expect(params.limit).toBe(50);
    expect(params.offset).toBe(0);
  });

  it('clamps pagination limit to 200', () => {
    const params = buildPaginationParams({ limit: 500 });
    expect(params.limit).toBe(200);
  });

  it('builds tweet search SQL parts', () => {
    const parts = buildTweetSearchQuery('solana breakout');
    expect(parts.tsQuery).toBe("solana & breakout");
  });

  it('handles single word search', () => {
    const parts = buildTweetSearchQuery('bitcoin');
    expect(parts.tsQuery).toBe("bitcoin");
  });
});
