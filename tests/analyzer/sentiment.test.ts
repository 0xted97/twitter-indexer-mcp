import { describe, it, expect } from 'vitest';
import { scoreSentiment } from '../src/analyzer/sentiment.js';

describe('sentiment', () => {
  it('scores bullish text as positive', () => {
    const score = scoreSentiment('BTC is pumping, very bullish! Moon soon!');
    expect(score).toBeGreaterThan(0);
  });

  it('scores bearish text as negative', () => {
    const score = scoreSentiment('Market is crashing, bearish dump incoming');
    expect(score).toBeLessThan(0);
  });

  it('scores neutral text near zero', () => {
    const score = scoreSentiment('Just had lunch at the office');
    expect(score).toBe(0);
  });
});
