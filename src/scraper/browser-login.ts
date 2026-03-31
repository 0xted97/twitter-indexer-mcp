import path from 'node:path';
import { chromium } from 'playwright';

interface CookieEntry {
  key: string;
  value: string;
  domain: string;
}

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

export async function loginViaBrowser(
  username: string,
  password: string,
  email: string,
  options?: { headless?: boolean; timeout?: number }
): Promise<CookieEntry[]> {
  const headless = options?.headless ?? (process.env.BROWSER_HEADLESS !== 'false');
  const timeout = options?.timeout ?? 60_000;
  const screenshotDir = path.join(process.cwd(), '.debug');

  const browser = await chromium.launch({
    headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ],
  });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });

  // Remove webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const page = await context.newPage();
  page.setDefaultTimeout(timeout);

  async function screenshot(name: string) {
    try {
      const { mkdirSync } = await import('node:fs');
      mkdirSync(screenshotDir, { recursive: true });
      await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
      console.log(`[browser] Screenshot saved: .debug/${name}.png`);
    } catch { /* ignore */ }
  }

  try {
    // Navigate to login page
    console.log('[browser] Navigating to login page...');
    await page.goto('https://x.com/i/flow/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(randomDelay(2000, 4000));
    await screenshot('01-login-page');

    // Enter username with human-like typing
    console.log('[browser] Entering username...');
    const usernameInput = page.locator('input[autocomplete="username"]');
    await usernameInput.waitFor({ state: 'visible', timeout: 15_000 });
    await usernameInput.click();
    await page.waitForTimeout(randomDelay(300, 700));
    await usernameInput.pressSequentially(username, { delay: randomDelay(50, 120) });
    await page.waitForTimeout(randomDelay(500, 1000));
    await screenshot('02-username-filled');

    // Click Next
    await page.locator('[role="button"]:has-text("Next")').click();
    await page.waitForTimeout(randomDelay(2000, 4000));
    await screenshot('03-after-next');

    // Check for "Could not log you in" error
    const errorBanner = page.locator('[data-testid="toast"]:has-text("Could not log you in"), [role="alert"]:has-text("Could not log you in")');
    const hasError = await errorBanner.isVisible().catch(() => false);
    if (hasError) {
      throw new Error('Twitter rejected login: "Could not log you in now. Please try again later." — wait a few minutes and retry');
    }

    // Handle email/phone challenge if it appears
    const emailChallenge = page.locator('input[data-testid="ocfEnterTextTextInput"]');
    const passwordInput = page.locator('input[type="password"]');

    const which = await Promise.race([
      emailChallenge.waitFor({ state: 'visible', timeout: 10_000 }).then(() => 'email' as const),
      passwordInput.waitFor({ state: 'visible', timeout: 10_000 }).then(() => 'password' as const),
    ]).catch(() => 'neither' as const);

    if (which === 'email') {
      console.log('[browser] Email challenge detected, entering email...');
      await emailChallenge.click();
      await page.waitForTimeout(randomDelay(300, 600));
      await emailChallenge.pressSequentially(email, { delay: randomDelay(50, 120) });
      await page.waitForTimeout(randomDelay(500, 1000));
      await page.locator('[data-testid="ocfEnterTextNextButton"]').click();
      await page.waitForTimeout(randomDelay(2000, 3000));
      await screenshot('04-email-challenge');
      await passwordInput.waitFor({ state: 'visible', timeout: 10_000 });
    } else if (which === 'neither') {
      await screenshot('03b-unexpected-state');
      throw new Error('Neither email challenge nor password field appeared — check .debug/ screenshots');
    }

    // Enter password with human-like typing
    console.log('[browser] Entering password...');
    await passwordInput.click();
    await page.waitForTimeout(randomDelay(300, 600));
    await passwordInput.pressSequentially(password, { delay: randomDelay(50, 120) });
    await page.waitForTimeout(randomDelay(500, 1000));
    await screenshot('05-password-filled');

    // Click Log in
    await page.locator('[data-testid="LoginForm_Login_Button"]').click();
    console.log('[browser] Waiting for login to complete...');
    await page.waitForTimeout(randomDelay(3000, 5000));
    await screenshot('06-after-login-click');

    // Wait for navigation to home
    try {
      await page.waitForURL(/\/(home|compose)/, { timeout: 30_000 });
    } catch {
      await screenshot('07-login-stuck');
      const cookies = await context.cookies();
      const hasAuth = cookies.some((c) => c.name === 'auth_token');
      if (!hasAuth) {
        throw new Error('Login did not complete — check .debug/ screenshots for details');
      }
    }

    await screenshot('07-logged-in');

    // Extract cookies
    const cookies = await context.cookies();
    return cookies
      .filter((c) => c.domain.includes('twitter.com') || c.domain.includes('x.com'))
      .map((c) => ({
        key: c.name,
        value: c.value,
        domain: c.domain,
      }));
  } catch (err) {
    await screenshot('error-state');
    throw err;
  } finally {
    await browser.close();
  }
}
