import { describe, it, expect } from 'vitest';
import { detectSpike } from '../src/analyzer/spike-detector.js';

describe('spike-detector', () => {
  it('detects a spike when current count exceeds threshold', () => {
    const result = detectSpike({
      currentCount: 100,
      averageCount: 20,
      thresholdPct: 200,
    });
    expect(result.isSpike).toBe(true);
    expect(result.increasePct).toBe(400);
  });

  it('does not detect spike below threshold', () => {
    const result = detectSpike({
      currentCount: 30,
      averageCount: 20,
      thresholdPct: 200,
    });
    expect(result.isSpike).toBe(false);
  });

  it('handles zero average gracefully', () => {
    const result = detectSpike({
      currentCount: 10,
      averageCount: 0,
      thresholdPct: 200,
    });
    expect(result.isSpike).toBe(true);
  });
});
