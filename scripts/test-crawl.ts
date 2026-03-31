import 'dotenv/config';
import { TwitterClient } from '../src/scraper/client.js';
import { loadWatchlist } from '../src/config/loader.js';
import { runTimelineJob, runSearchJob, runTrendsJob } from '../src/scheduler/jobs.js';
import { searchTweets, getTokenMentionCount } from '../src/db/queries.js';
import path from 'node:path';

async function main() {
  const client = new TwitterClient();
  const loaded = client.loadCookiesFromDisk();
  if (!loaded || !client.isLoggedIn()) {
    console.error('No valid cookies. Run test-login.ts first.');
    process.exit(1);
  }
  console.log('[test] Cookies loaded, client ready');

  const watchlist = loadWatchlist(path.join(process.cwd(), 'config/watchlist.yaml'));
  console.log(`[test] Watchlist: ${watchlist.influencers.length} influencers, ${watchlist.tokens.length} tokens`);

  // 1. Run timeline job (fetch influencer tweets)
  console.log('\n--- Timeline Job ---');
  try {
    const tweets = await runTimelineJob(client, watchlist, 5);
    console.log(`[test] Indexed ${tweets.length} tweets from influencers`);
    for (const t of tweets.slice(0, 3)) {
      console.log(`  @${t.username}: ${t.fullText.slice(0, 80)}...`);
    }
  } catch (err) {
    console.error('[test] Timeline job failed:', err);
  }

  // 2. Run search job (search for tokens/hashtags)
  console.log('\n--- Search Job ---');
  try {
    const tweets = await runSearchJob(client, watchlist, 5);
    console.log(`[test] Indexed ${tweets.length} tweets from search`);
    for (const t of tweets.slice(0, 3)) {
      console.log(`  @${t.username}: ${t.fullText.slice(0, 80)}...`);
    }
  } catch (err) {
    console.error('[test] Search job failed:', err);
  }

  // 3. Run trends job
  console.log('\n--- Trends Job ---');
  try {
    await runTrendsJob(client);
  } catch (err) {
    console.error('[test] Trends job failed:', err);
  }

  // 4. Query DB
  console.log('\n--- DB Verification ---');
  try {
    const results = await searchTweets('crypto', 5);
    console.log(`[test] Full-text search "crypto": ${results.length} results`);
    for (const r of results) {
      console.log(`  [${r.id}] ${(r.fullText as string)?.slice(0, 80)}...`);
    }
  } catch (err) {
    console.error('[test] DB query failed:', err);
  }

  // 5. Token mention counts
  console.log('\n--- Token Mentions ---');
  for (const token of watchlist.tokens) {
    try {
      const count = await getTokenMentionCount(token.symbol, 24);
      console.log(`  ${token.symbol}: ${count} mentions (24h)`);
    } catch (err) {
      console.error(`  ${token.symbol}: error -`, err);
    }
  }

  console.log('\n[test] Done!');
  process.exit(0);
}

main().catch(console.error);
