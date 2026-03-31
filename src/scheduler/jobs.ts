import type { Watchlist } from '../config/types.js';
import type { TwitterClient } from '../scraper/client.js';
import type { ParsedTweet, ParsedUser } from '../scraper/types.js';
import { parseTweetForDb } from '../indexer/parser.js';
import { extractTokenMentions } from '../indexer/enricher.js';
import { upsertTweet, upsertUser, insertTokenMention, tweetExists } from '../db/queries.js';

export function buildSearchQueries(watchlist: Watchlist): string[] {
  const queries: string[] = [];
  for (const token of watchlist.tokens) {
    queries.push(`$${token.symbol}`);
  }
  for (const hashtag of watchlist.hashtags) {
    queries.push(hashtag);
  }
  return queries;
}

export async function runTimelineJob(
  client: TwitterClient,
  watchlist: Watchlist,
  batchSize: number
): Promise<ParsedTweet[]> {
  const allTweets: ParsedTweet[] = [];

  // Sort influencers by priority (1 = highest)
  const sorted = [...watchlist.influencers].sort((a, b) => a.priority - b.priority);

  for (const influencer of sorted) {
    const profile = await client.getUserProfile(influencer.username);
    if (!profile) continue;

    // Upsert user
    await upsertUser({
      id: BigInt(profile.id),
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      followersCount: profile.followersCount,
      followingCount: profile.followingCount,
      isWatched: true,
      priority: influencer.priority,
    });

    // Fetch tweets
    const { tweets } = await client.getUserTweets(profile.id, batchSize);

    for (const tweet of tweets) {
      const record = parseTweetForDb(tweet);
      const isNew = !(await tweetExists(record.id));
      await upsertTweet(record);

      // Extract and save token mentions (only for new tweets)
      if (isNew) {
        const mentions = extractTokenMentions(tweet.fullText, watchlist.tokens);
        for (const mention of mentions) {
          await insertTokenMention({
            tweetId: record.id,
            symbol: mention.symbol,
            cashtag: mention.cashtag,
          });
        }
        allTweets.push(tweet);
      }
    }
  }

  return allTweets;
}

export async function runSearchJob(
  client: TwitterClient,
  watchlist: Watchlist,
  batchSize: number
): Promise<ParsedTweet[]> {
  const allTweets: ParsedTweet[] = [];
  const queries = buildSearchQueries(watchlist);

  for (const query of queries) {
    const { tweets } = await client.searchTweets(query, batchSize, 'Latest');

    for (const tweet of tweets) {
      // Upsert the tweet author
      if (tweet.userId) {
        await upsertUser({
          id: BigInt(tweet.userId),
          username: tweet.username ?? 'unknown',
        });
      }

      const record = parseTweetForDb(tweet);
      const isNew = !(await tweetExists(record.id));
      await upsertTweet(record);

      if (isNew) {
        const mentions = extractTokenMentions(tweet.fullText, watchlist.tokens);
        for (const mention of mentions) {
          await insertTokenMention({
            tweetId: record.id,
            symbol: mention.symbol,
            cashtag: mention.cashtag,
          });
        }
        allTweets.push(tweet);
      }
    }
  }

  return allTweets;
}

export async function runTrendsJob(client: TwitterClient): Promise<void> {
  const trends = await client.getTrends();
  console.log(`[trends] Fetched ${trends.length} trends:`, trends.slice(0, 5).map((t) => t.name));
}
