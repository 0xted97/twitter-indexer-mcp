const BULLISH_WORDS = [
  'bullish', 'pump', 'pumping', 'moon', 'mooning', 'buy', 'long',
  'breakout', 'rally', 'surge', 'soaring', 'ath', 'all time high',
  'accumulate', 'undervalued', 'gem', 'rocket', 'green', 'gains',
];

const BEARISH_WORDS = [
  'bearish', 'dump', 'dumping', 'crash', 'crashing', 'sell', 'short',
  'breakdown', 'plunge', 'tank', 'rug', 'rugged', 'scam', 'overvalued',
  'red', 'loss', 'losses', 'liquidated', 'rekt', 'fear',
];

export function scoreSentiment(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;

  for (const word of BULLISH_WORDS) {
    if (lower.includes(word)) score += 1;
  }

  for (const word of BEARISH_WORDS) {
    if (lower.includes(word)) score -= 1;
  }

  return score;
}
