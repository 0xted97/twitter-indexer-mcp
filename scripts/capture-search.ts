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
    const url = req.url();
    if (url.includes('SearchTimeline')) {
      console.log('\n=== SearchTimeline Request ===');
      console.log('URL:', url);
      console.log('Method:', req.method());

      // Parse the URL to extract variables and features
      const u = new URL(url);
      const vars = u.searchParams.get('variables');
      const features = u.searchParams.get('features');
      const fieldToggles = u.searchParams.get('fieldToggles');

      if (vars) console.log('\nVariables:', JSON.stringify(JSON.parse(vars), null, 2));
      if (features) console.log('\nFeatures:', JSON.stringify(JSON.parse(features), null, 2));
      if (fieldToggles) console.log('\nFieldToggles:', JSON.stringify(JSON.parse(fieldToggles), null, 2));
    }
  });

  console.log('Navigating to search...');
  await page.goto('https://x.com/search?q=%24BTC&src=typed_query&f=live', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);

  await browser.close();
}

main().catch(console.error);
