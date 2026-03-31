import 'dotenv/config';
import { TwitterClient } from '../src/scraper/client.js';

async function main() {
  const client = new TwitterClient();

  const { TWITTER_USERNAME, TWITTER_PASSWORD, TWITTER_EMAIL } = process.env;
  if (!TWITTER_USERNAME || !TWITTER_PASSWORD || !TWITTER_EMAIL) {
    console.error('Missing TWITTER_USERNAME, TWITTER_PASSWORD, or TWITTER_EMAIL in .env');
    process.exit(1);
  }

  console.log(`[test] Logging in as @${TWITTER_USERNAME}...`);

  try {
    await client.login(TWITTER_USERNAME, TWITTER_PASSWORD, TWITTER_EMAIL);
    console.log('[test] Login successful!');
    console.log(`[test] Cookies saved: ${client.getCookies().length} cookies`);

    // Quick test: fetch profile
    console.log('[test] Fetching profile for @thuancapital...');
    const profile = await client.getUserProfile('thuancapital');
    if (profile) {
      console.log('[test] Profile found:');
      console.log(`  Username: @${profile.username}`);
      console.log(`  Name: ${profile.displayName}`);
      console.log(`  Followers: ${profile.followersCount}`);
      console.log(`  Following: ${profile.followingCount}`);
    } else {
      console.log('[test] Could not fetch profile');
    }
  } catch (err) {
    console.error('[test] Login failed:', err);
    process.exit(1);
  }
}

main();
