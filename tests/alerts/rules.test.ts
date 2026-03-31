import { describe, it, expect } from 'vitest';
import { evaluateRules, formatMessage } from '../src/alerts/rules.js';
import type { AlertRule } from '../src/config/types.js';

const rules: AlertRule[] = [
  {
    name: 'high_priority_post',
    trigger: 'influencer_post',
    condition: { priority: [1, 2] },
    message: '{{username}} just tweeted:\n{{text}}',
  },
  {
    name: 'keyword_alert',
    trigger: 'keyword_match',
    condition: { keywords: ['airdrop', 'listing'], min_followers: 10000 },
    message: "Keyword '{{keyword}}' from @{{username}}:\n{{text}}",
  },
];

describe('alert rules', () => {
  it('matches influencer_post rule by priority', () => {
    const matched = evaluateRules(rules, {
      trigger: 'influencer_post',
      priority: 1,
      username: 'CryptoCapo_',
      text: 'BTC looking strong',
    });
    expect(matched).toHaveLength(1);
    expect(matched[0]!.name).toBe('high_priority_post');
  });

  it('does not match wrong priority', () => {
    const matched = evaluateRules(rules, {
      trigger: 'influencer_post',
      priority: 5,
      username: 'nobody',
      text: 'hello',
    });
    expect(matched).toHaveLength(0);
  });

  it('matches keyword_match rule', () => {
    const matched = evaluateRules(rules, {
      trigger: 'keyword_match',
      keyword: 'airdrop',
      username: 'whale',
      text: 'New airdrop announced!',
      followers: 50000,
    });
    expect(matched).toHaveLength(1);
  });

  it('does not match keyword if followers too low', () => {
    const matched = evaluateRules(rules, {
      trigger: 'keyword_match',
      keyword: 'airdrop',
      username: 'small',
      text: 'airdrop',
      followers: 100,
    });
    expect(matched).toHaveLength(0);
  });

  it('formats message with template variables', () => {
    const msg = formatMessage('{{username}} said: {{text}}', {
      username: 'alice',
      text: 'hello world',
    });
    expect(msg).toBe('alice said: hello world');
  });
});
