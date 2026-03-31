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

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('SearchTimeline')) {
      console.log('\n=== SearchTimeline Response ===');
      console.log('Status:', res.status());
      console.log('URL:', url.slice(0, 150));
      try {
        const body = await res.json();
        fs.writeFileSync('.debug/search-browser-response.json', JSON.stringify(body, null, 2));
        console.log('Response saved to .debug/search-browser-response.json');
        const instructions = body?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions;
        if (instructions) {
          for (const i of instructions) {
            console.log(`  instruction: ${i.type}, entries: ${i.entries?.length ?? 'N/A'}`);
          }
        }
      } catch (e) {
        console.log('Failed to parse response:', e);
      }
    }
  });

  console.log('Navigating to search...');
  await page.goto('https://x.com/search?q=%24BTC&src=typed_query&f=live', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(10000);

  await browser.close();
}

main().catch(console.error);
