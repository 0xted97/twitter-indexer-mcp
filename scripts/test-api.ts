import 'dotenv/config';
import { TwitterClient } from '../src/scraper/client.js';
import { buildUserByScreenNameUrl } from '../src/scraper/endpoints.js';

async function main() {
  const client = new TwitterClient();

  const loaded = client.loadCookiesFromDisk();
  if (!loaded) {
    console.error('[test] No saved cookies found. Run test-login.ts first.');
    process.exit(1);
  }
  console.log(`[test] Loaded ${client.getCookies().length} cookies`);

  const headers = client.getAuthHeaders();
  console.log('[test] Headers:');
  for (const [k, v] of Object.entries(headers)) {
    if (k === 'cookie') {
      console.log(`  ${k}: ${v.slice(0, 100)}...`);
    } else if (k === 'authorization') {
      console.log(`  ${k}: ${v.slice(0, 40)}...`);
    } else {
      console.log(`  ${k}: ${v}`);
    }
  }

  // Try x.com graphql
  const url = buildUserByScreenNameUrl('thuancapital');
  console.log(`\n[test] Trying x.com GraphQL...`);
  let res = await fetch(url, { headers });
  console.log(`  Status: ${res.status}`);
  let body = await res.text();
  console.log(`  Body: ${body.slice(0, 200)}`);

  // Try twitter.com graphql
  const url2 = url.replace('x.com', 'twitter.com');
  console.log(`\n[test] Trying twitter.com GraphQL...`);
  res = await fetch(url2, { headers });
  console.log(`  Status: ${res.status}`);
  body = await res.text();
  console.log(`  Body: ${body.slice(0, 200)}`);

  // Try api.twitter.com
  const url3 = url.replace('x.com/i/api', 'api.twitter.com');
  console.log(`\n[test] Trying api.twitter.com GraphQL...`);
  res = await fetch(url3, { headers });
  console.log(`  Status: ${res.status}`);
  body = await res.text();
  console.log(`  Body: ${body.slice(0, 200)}`);
}

main().catch(console.error);
