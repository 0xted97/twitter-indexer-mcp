import 'dotenv/config';
import { TwitterClient } from '../src/scraper/client.js';

async function main() {
  const client = new TwitterClient();
  const loaded = client.loadCookiesFromDisk();
  console.log(`Cookies loaded: ${loaded}, count: ${client.getCookies().length}`);

  const headers = client.getAuthHeaders();
  const res = await fetch('https://api.x.com/1.1/account/verify_credentials.json', { headers });
  console.log('Status:', res.status);
  const body = await res.text();
  console.log('Body:', body.slice(0, 300));
}

main().catch(console.error);
