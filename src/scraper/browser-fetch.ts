import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const COOKIES_DIR = process.env.COOKIES_DIR ?? path.join(process.cwd(), '.cookies');
const COOKIES_FILE = path.join(COOKIES_DIR, 'cookies.json');

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

async function ensureBrowser(): Promise<{ page: Page; context: BrowserContext }> {
  if (page && context) return { page, context };

  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });

  // Remove webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  // Load cookies
  try {
    const data = fs.readFileSync(COOKIES_FILE, 'utf-8');
    const cookies = JSON.parse(data) as Array<{ key: string; value: string; domain: string }>;
    await context.addCookies(
      cookies.map((c) => ({ name: c.key, value: c.value, domain: c.domain, path: '/' }))
    );
  } catch { /* no cookies */ }

  page = await context.newPage();
  return { page, context };
}

/**
 * Perform a Twitter search by navigating to the search page in a real browser
 * and intercepting the GraphQL response. This bypasses the x-client-transaction-id
 * requirement that blocks direct API calls.
 */
export async function browserSearch(query: string, mode: 'Top' | 'Latest' = 'Latest'): Promise<any> {
  const { page: p } = await ensureBrowser();

  return new Promise<any>(async (resolve) => {
    let resolved = false;

    const handler = async (response: any) => {
      if (resolved) return;
      const url = response.url();
      if (url.includes('SearchTimeline')) {
        try {
          const data = await response.json();
          resolved = true;
          p.off('response', handler);
          resolve(data);
        } catch { /* ignore parse errors */ }
      }
    };

    p.on('response', handler);

    const modeParam = mode === 'Latest' ? '&f=live' : '';
    const encodedQuery = encodeURIComponent(query);
    await p.goto(`https://x.com/search?q=${encodedQuery}&src=typed_query${modeParam}`, {
      waitUntil: 'domcontentloaded',
    });

    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        p.off('response', handler);
        resolve(null);
      }
    }, 15_000);
  });
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    context = null;
    page = null;
  }
}
