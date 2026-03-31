import { describe, it, expect } from 'vitest';
import { extractTokenMentions } from '../src/indexer/enricher.js';

describe('enricher', () => {
  it('extracts cashtags from tweet text', () => {
    const mentions = extractTokenMentions(
      'I am bullish on $SOL and $BTC today!',
      [{ symbol: 'SOL', aliases: ['solana', '$SOL'] }, { symbol: 'BTC', aliases: ['bitcoin', '$BTC'] }]
    );
    expect(mentions).toEqual([
      { symbol: 'SOL', cashtag: '$SOL' },
      { symbol: 'BTC', cashtag: '$BTC' },
    ]);
  });

  it('matches aliases case-insensitively', () => {
    const mentions = extractTokenMentions(
      'Solana is pumping hard',
      [{ symbol: 'SOL', aliases: ['solana', '$SOL'] }]
    );
    expect(mentions).toEqual([{ symbol: 'SOL', cashtag: undefined }]);
  });

  it('returns empty for no matches', () => {
    const mentions = extractTokenMentions(
      'Nice weather today',
      [{ symbol: 'SOL', aliases: ['solana', '$SOL'] }]
    );
    expect(mentions).toEqual([]);
  });

  it('deduplicates matches', () => {
    const mentions = extractTokenMentions(
      '$SOL solana $SOL',
      [{ symbol: 'SOL', aliases: ['solana', '$SOL'] }]
    );
    expect(mentions).toHaveLength(1);
    expect(mentions[0]!.symbol).toBe('SOL');
  });
});
