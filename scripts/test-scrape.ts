import 'dotenv/config';
import { TwitterClient } from '../src/scraper/client.js';

async function main() {
  const client = new TwitterClient();
  client.loadCookiesFromDisk();

  // Test 1: Get profile
  console.log('--- Profile ---');
  const profile = await client.getUserProfile('thuancapital');
  if (!profile) { console.log('Profile not found!'); return; }
  console.log(`@${profile.username} (ID: ${profile.id}), ${profile.followersCount} followers`);

  // Test 2: Get user tweets
  console.log('\n--- User Tweets ---');
  const { tweets, nextCursor } = await client.getUserTweets(profile.id, 5);
  console.log(`Got ${tweets.length} tweets, cursor: ${nextCursor?.slice(0, 30)}...`);
  for (const t of tweets.slice(0, 3)) {
    console.log(`  [${t.id}] @${t.username}: ${t.fullText.slice(0, 100)}`);
  }

  // Test 3: Search tweets
  console.log('\n--- Search: $BTC ---');
  const search = await client.searchTweets('$BTC', 5);
  console.log(`Got ${search.tweets.length} tweets`);
  for (const t of search.tweets.slice(0, 3)) {
    console.log(`  [${t.id}] @${t.username}: ${t.fullText.slice(0, 100)}`);
  }

  // Test 4: Trends
  console.log('\n--- Trends ---');
  const trends = await client.getTrends();
  console.log(`Got ${trends.length} trends`);
  for (const t of trends.slice(0, 5)) {
    console.log(`  ${t.name} (${t.tweetCount ?? 'N/A'} tweets)`);
  }
}

main().catch(console.error);
