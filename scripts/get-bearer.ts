import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Intercept requests to find bearer token
  const bearerTokens = new Set<string>();
  page.on('request', (req) => {
    const auth = req.headers()['authorization'];
    if (auth?.startsWith('Bearer ')) {
      bearerTokens.add(auth.replace('Bearer ', ''));
    }
  });

  await page.goto('https://x.com', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  console.log('Bearer tokens found:');
  for (const token of bearerTokens) {
    console.log(`  ${token}`);
  }

  await browser.close();
}

main().catch(console.error);
