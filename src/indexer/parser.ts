import type { ParsedTweet } from '../scraper/types.js';

export interface TweetDbRecord {
  id: bigint;
  userId: bigint;
  text: string;
  fullText: string;
  tweetType: 'tweet' | 'reply' | 'retweet' | 'quote';
  replyToId?: bigint;
  quoteOfId?: bigint;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  mediaUrls: string[];
  urls: string[];
  tweetedAt: Date;
}

export function parseTweetForDb(tweet: ParsedTweet): TweetDbRecord {
  return {
    id: BigInt(tweet.id),
    userId: BigInt(tweet.userId),
    text: tweet.text,
    fullText: tweet.fullText,
    tweetType: tweet.tweetType,
    replyToId: tweet.replyToId ? BigInt(tweet.replyToId) : undefined,
    quoteOfId: tweet.quoteOfId ? BigInt(tweet.quoteOfId) : undefined,
    likes: tweet.likes,
    retweets: tweet.retweets,
    replies: tweet.replies,
    views: tweet.views,
    mediaUrls: tweet.mediaUrls,
    urls: tweet.urls,
    tweetedAt: tweet.tweetedAt,
  };
}
