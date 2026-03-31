import {
  pgTable,
  bigint,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  serial,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const tweetTypeEnum = pgEnum('tweet_type', ['tweet', 'reply', 'retweet', 'quote']);

export const users = pgTable('users', {
  id: bigint('id', { mode: 'bigint' }).primaryKey(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  displayName: varchar('display_name', { length: 100 }),
  bio: text('bio'),
  followersCount: integer('followers_count').default(0),
  followingCount: integer('following_count').default(0),
  isWatched: boolean('is_watched').default(false),
  priority: integer('priority').default(5),
  lastCrawledAt: timestamp('last_crawled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const tweets = pgTable(
  'tweets',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey(),
    userId: bigint('user_id', { mode: 'bigint' }).references(() => users.id),
    text: text('text'),
    fullText: text('full_text'),
    tweetType: tweetTypeEnum('tweet_type').default('tweet'),
    replyToId: bigint('reply_to_id', { mode: 'bigint' }),
    quoteOfId: bigint('quote_of_id', { mode: 'bigint' }),
    likes: integer('likes').default(0),
    retweets: integer('retweets').default(0),
    replies: integer('replies').default(0),
    views: integer('views').default(0),
    mediaUrls: jsonb('media_urls').$type<string[]>().default([]),
    urls: jsonb('urls').$type<string[]>().default([]),
    tweetedAt: timestamp('tweeted_at', { withTimezone: true }),
    searchVector: text('search_vector'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('tweets_user_id_tweeted_at_idx').on(table.userId, table.tweetedAt),
    index('tweets_tweeted_at_idx').on(table.tweetedAt),
  ]
);

export const tokenMentions = pgTable(
  'token_mentions',
  {
    id: serial('id').primaryKey(),
    tweetId: bigint('tweet_id', { mode: 'bigint' }).references(() => tweets.id),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    cashtag: varchar('cashtag', { length: 20 }),
  },
  (table) => [
    index('token_mentions_symbol_idx').on(table.symbol, table.tweetId),
  ]
);
