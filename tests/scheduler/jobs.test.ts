import { describe, it, expect, vi } from 'vitest';
import { buildSearchQueries } from '../src/scheduler/jobs.js';

describe('jobs', () => {
  it('builds search queries from watchlist tokens and hashtags', () => {
    const queries = buildSearchQueries({
      influencers: [],
      tokens: [
        { symbol: 'BTC', aliases: ['bitcoin', '$BTC'] },
        { symbol: 'SOL', aliases: ['solana', '$SOL'] },
      ],
      hashtags: ['#crypto', '#defi'],
    });

    expect(queries).toContain('$BTC');
    expect(queries).toContain('$SOL');
    expect(queries).toContain('#crypto');
    expect(queries).toContain('#defi');
  });

  it('returns empty array for empty watchlist', () => {
    const queries = buildSearchQueries({
      influencers: [],
      tokens: [],
      hashtags: [],
    });
    expect(queries).toEqual([]);
  });
});
