import type { Token } from '../config/types.js';

export interface TokenMatch {
  symbol: string;
  cashtag?: string;
}

export function extractTokenMentions(text: string, tokens: Token[]): TokenMatch[] {
  const matches = new Map<string, TokenMatch>();
  const lowerText = text.toLowerCase();

  for (const token of tokens) {
    // Check cashtag (e.g. $SOL)
    const cashtagPattern = new RegExp(`\\$${token.symbol}\\b`, 'i');
    const cashtagMatch = text.match(cashtagPattern);

    if (cashtagMatch) {
      matches.set(token.symbol, { symbol: token.symbol, cashtag: cashtagMatch[0] });
      continue;
    }

    // Check aliases
    const aliasMatched = token.aliases.some((alias) => {
      if (alias.startsWith('$')) {
        return cashtagPattern.test(text);
      }
      return lowerText.includes(alias.toLowerCase());
    });

    if (aliasMatched) {
      matches.set(token.symbol, { symbol: token.symbol, cashtag: undefined });
    }
  }

  return Array.from(matches.values());
}
