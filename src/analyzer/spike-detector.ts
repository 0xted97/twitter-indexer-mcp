export interface SpikeInput {
  currentCount: number;
  averageCount: number;
  thresholdPct: number;
}

export interface SpikeResult {
  isSpike: boolean;
  increasePct: number;
}

export function detectSpike(input: SpikeInput): SpikeResult {
  const { currentCount, averageCount, thresholdPct } = input;

  if (averageCount === 0) {
    return {
      isSpike: currentCount > 0,
      increasePct: currentCount > 0 ? Infinity : 0,
    };
  }

  const increasePct = ((currentCount - averageCount) / averageCount) * 100;

  return {
    isSpike: increasePct >= thresholdPct,
    increasePct: Math.round(increasePct),
  };
}
