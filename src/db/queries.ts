import { eq, desc, and, gte, lte, sql, type SQL } from 'drizzle-orm';
import { tweets, users, tokenMentions } from './schema.js';
import { getDb } from './connection.js';

export interface PaginationInput {
  limit?: number;
  offset?: number;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export function buildPaginationParams(input: PaginationInput): PaginationParams {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  return { limit, offset };
}

export function buildTweetSearchQuery(query: string) {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  const tsQuery = terms.join(' & ');
  return { tsQuery };
}

export async function searchTweets(query: string, pagination: PaginationInput) {
  const db = getDb();
  const { limit, offset } = buildPaginationParams(pagination);
  const { tsQuery } = buildTweetSearchQuery(query);

  return db
    .select()
    .from(tweets)
    .where(sql`search_vector @@ to_tsquery('english', ${tsQuery})`)
    .orderBy(desc(tweets.tweetedAt))
    .limit(limit)
    .offset(offset);
}

export async function getTweetsByUser(username: string, pagination: PaginationInput) {
  const db = getDb();
  const { limit, offset } = buildPaginationParams(pagination);

  return db
    .select()
    .from(tweets)
    .innerJoin(users, eq(tweets.userId, users.id))
    .where(eq(users.username, username))
    .orderBy(desc(tweets.tweetedAt))
    .limit(limit)
    .offset(offset);
}

export async function getTokenMentions(
  symbol: string,
  pagination: PaginationInput,
  dateRange?: { from?: string; to?: string }
) {
  const db = getDb();
  const { limit, offset } = buildPaginationParams(pagination);

  const conditions: SQL[] = [eq(tokenMentions.symbol, symbol.toUpperCase())];
  if (dateRange?.from) {
    conditions.push(gte(tweets.tweetedAt, new Date(dateRange.from)));
  }
  if (dateRange?.to) {
    conditions.push(lte(tweets.tweetedAt, new Date(dateRange.to)));
  }

  return db
    .select()
    .from(tokenMentions)
    .innerJoin(tweets, eq(tokenMentions.tweetId, tweets.id))
    .where(and(...conditions))
    .orderBy(desc(tweets.tweetedAt))
    .limit(limit)
    .offset(offset);
}

export async function getWatchedUsers() {
  const db = getDb();
  return db.select().from(users).where(eq(users.isWatched, true)).orderBy(users.priority);
}

export async function upsertUser(user: {
  id: bigint;
  username: string;
  displayName?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  isWatched?: boolean;
  priority?: number;
}) {
  const db = getDb();
  return db
    .insert(users)
    .values({
      ...user,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        updatedAt: new Date(),
      },
    });
}

export async function upsertTweet(tweet: {
  id: bigint;
  userId: bigint;
  text: string;
  fullText?: string;
  tweetType?: 'tweet' | 'reply' | 'retweet' | 'quote';
  replyToId?: bigint;
  quoteOfId?: bigint;
  likes?: number;
  retweets?: number;
  replies?: number;
  views?: number;
  mediaUrls?: string[];
  urls?: string[];
  tweetedAt?: Date;
}) {
  const db = getDb();
  return db
    .insert(tweets)
    .values({
      ...tweet,
      searchVector: sql`to_tsvector('english', ${tweet.fullText ?? tweet.text})`,
    })
    .onConflictDoUpdate({
      target: tweets.id,
      set: {
        likes: tweet.likes,
        retweets: tweet.retweets,
        replies: tweet.replies,
        views: tweet.views,
      },
    });
}

export async function insertTokenMention(mention: {
  tweetId: bigint;
  symbol: string;
  cashtag?: string;
}) {
  const db = getDb();
  return db.insert(tokenMentions).values(mention);
}

export async function getLatestTweets(pagination: PaginationInput) {
  const db = getDb();
  const { limit, offset } = buildPaginationParams(pagination);

  return db
    .select()
    .from(tweets)
    .orderBy(desc(tweets.tweetedAt))
    .limit(limit)
    .offset(offset);
}

export async function tweetExists(id: bigint): Promise<boolean> {
  const db = getDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(tweets)
    .where(eq(tweets.id, id));
  return (result[0]?.count ?? 0) > 0;
}

export async function getTokenMentionCount(symbol: string, sinceHoursAgo: number) {
  const db = getDb();
  const since = new Date(Date.now() - sinceHoursAgo * 60 * 60 * 1000);
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(tokenMentions)
    .innerJoin(tweets, eq(tokenMentions.tweetId, tweets.id))
    .where(and(eq(tokenMentions.symbol, symbol.toUpperCase()), gte(tweets.tweetedAt, since)));
  return result[0]?.count ?? 0;
}
