import 'dotenv/config';
import { TwitterClient } from '../src/scraper/client.js';
import { buildUserByScreenNameUrl, buildUserTweetsUrl, buildSearchUrl } from '../src/scraper/endpoints.js';
import fs from 'node:fs';

async function main() {
  const client = new TwitterClient();
  client.loadCookiesFromDisk();

  // Profile
  const profileUrl = buildUserByScreenNameUrl('thuancapital');
  let res = await fetch(profileUrl, { headers: client.getAuthHeaders() });
  const profileData = await res.json();
  fs.writeFileSync('.debug/profile-raw.json', JSON.stringify(profileData, null, 2));
  console.log('Profile saved to .debug/profile-raw.json');

  // Tweets
  const userId = (profileData as any)?.data?.user?.result?.rest_id;
  console.log('User ID:', userId);
  if (userId) {
    const tweetsUrl = buildUserTweetsUrl(userId, 5);
    res = await fetch(tweetsUrl, { headers: client.getAuthHeaders() });
    const tweetsData = await res.json();
    fs.writeFileSync('.debug/tweets-raw.json', JSON.stringify(tweetsData, null, 2));
    console.log('Tweets saved to .debug/tweets-raw.json');
  }

  // Search
  const searchUrl = buildSearchUrl('$BTC', 5, 'Latest');
  res = await fetch(searchUrl, { headers: client.getAuthHeaders() });
  const searchText = await res.text();
  fs.writeFileSync('.debug/search-raw.json', searchText || '{"empty":true}');
  console.log('Search saved to .debug/search-raw.json');
  console.log('Search status:', res.status);
}

main().catch(console.error);
