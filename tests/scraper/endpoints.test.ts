import { describe, it, expect } from 'vitest';
import {
  buildUserTweetsUrl,
  buildSearchUrl,
  buildUserByScreenNameUrl,
  BEARER_TOKEN,
} from '../src/scraper/endpoints.js';

describe('endpoints', () => {
  it('has a bearer token', () => {
    expect(BEARER_TOKEN).toMatch(/^AAAAAAAAAAAAA/);
  });

  it('builds UserTweets URL with variables', () => {
    const url = buildUserTweetsUrl('12345', 20);
    expect(url).toContain('/graphql/');
    expect(url).toContain('UserTweets');
    expect(url).toContain('12345');
  });

  it('builds SearchTimeline URL', () => {
    const url = buildSearchUrl('bitcoin', 50, 'Latest');
    expect(url).toContain('/graphql/');
    expect(url).toContain('SearchTimeline');
    expect(url).toContain('bitcoin');
  });

  it('builds UserByScreenName URL', () => {
    const url = buildUserByScreenNameUrl('elonmusk');
    expect(url).toContain('UserByScreenName');
    expect(url).toContain('elonmusk');
  });
});
