import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const cookiesFile = path.join(process.cwd(), '.cookies/cookies.json');
  const savedCookies = JSON.parse(fs.readFileSync(cookiesFile, 'utf-8')) as Array<{ key: string; value: string; domain: string }>;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies(savedCookies.map((c) => ({ name: c.key, value: c.value, domain: c.domain, path: '/' })));

  const page = await context.newPage();

  page.on('request', (req) => {
    if (req.url().includes('SearchTimeline')) {
      console.log('=== Search Request Headers ===');
      const headers = req.headers();
      for (const [k, v] of Object.entries(headers)) {
        if (k === 'cookie') {
          console.log(`  ${k}: ${v.slice(0, 50)}...`);
        } else {
          console.log(`  ${k}: ${v}`);
        }
      }
    }
  });

  await page.goto('https://x.com/search?q=%24BTC&src=typed_query&f=live', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  await browser.close();
}

main().catch(console.error);
