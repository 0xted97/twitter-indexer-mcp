import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // Load saved cookies to be logged in
  const cookiesFile = path.join(process.cwd(), '.cookies/cookies.json');
  const savedCookies = JSON.parse(fs.readFileSync(cookiesFile, 'utf-8')) as Array<{ key: string; value: string; domain: string }>;
  const playwrightCookies = savedCookies.map((c) => ({
    name: c.key,
    value: c.value,
    domain: c.domain,
    path: '/',
  }));

  const context = await browser.newContext();
  await context.addCookies(playwrightCookies);
  const page = await context.newPage();

  const queryIds = new Map<string, string>();

  page.on('request', (req) => {
    const url = req.url();
    const match = url.match(/\/graphql\/([^/]+)\/(\w+)/);
    if (match) {
      queryIds.set(match[2], match[1]);
    }
  });

  // Visit home
  console.log('Visiting home...');
  await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  // Search
  console.log('Visiting search...');
  await page.goto('https://x.com/search?q=%24BTC&src=typed_query&f=live', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  // Profile
  console.log('Visiting profile...');
  await page.goto('https://x.com/thuancapital', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  console.log('\nGraphQL Query IDs found:');
  const sorted = [...queryIds.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [name, id] of sorted) {
    console.log(`  ${name}: '${id}'`);
  }

  await browser.close();
}

main().catch(console.error);
