import { describe, it, expect } from 'vitest';
import { parseTweetForDb } from '../src/indexer/parser.js';
import type { ParsedTweet } from '../src/scraper/types.js';

describe('parser', () => {
  const mockTweet: ParsedTweet = {
    id: '123456789',
    userId: '987654321',
    username: 'testuser',
    text: 'Hello world',
    fullText: 'Hello world, this is a test tweet',
    tweetType: 'tweet',
    likes: 10,
    retweets: 5,
    replies: 2,
    views: 100,
    mediaUrls: ['https://pbs.twimg.com/media/test.jpg'],
    urls: ['https://example.com'],
    hashtags: ['test'],
    mentions: ['someuser'],
    tweetedAt: new Date('2026-03-28T12:00:00Z'),
  };

  it('converts ParsedTweet to DB record', () => {
    const record = parseTweetForDb(mockTweet);
    expect(record.id).toBe(BigInt('123456789'));
    expect(record.userId).toBe(BigInt('987654321'));
    expect(record.text).toBe('Hello world');
    expect(record.tweetType).toBe('tweet');
    expect(record.likes).toBe(10);
    expect(record.mediaUrls).toEqual(['https://pbs.twimg.com/media/test.jpg']);
  });

  it('handles missing optional fields', () => {
    const minimal: ParsedTweet = {
      id: '111',
      userId: '222',
      text: 'test',
      fullText: 'test',
      tweetType: 'tweet',
      likes: 0,
      retweets: 0,
      replies: 0,
      views: 0,
      mediaUrls: [],
      urls: [],
      hashtags: [],
      mentions: [],
      tweetedAt: new Date(),
    };
    const record = parseTweetForDb(minimal);
    expect(record.replyToId).toBeUndefined();
    expect(record.quoteOfId).toBeUndefined();
  });
});
