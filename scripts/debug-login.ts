import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import tls from 'node:tls';
import { Agent, fetch as undiciFetch } from 'undici';

// Randomize TLS ciphers before creating any connections
const TOP_N = 8;
const ciphers = tls.DEFAULT_CIPHERS.split(':');
const top = ciphers.slice(0, TOP_N);
const rest = ciphers.slice(TOP_N);
for (let i = top.length - 1; i > 0; i--) {
  const j = randomBytes(4).readUint32LE() % (i + 1);
  [top[i], top[j]] = [top[j], top[i]];
}
const randomizedCiphers = [...top, ...rest].join(':');

// Create undici agent with randomized ciphers
const dispatcher = new Agent({
  connect: { ciphers: randomizedCiphers },
});

const BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAAFQODgEAAAAAVHTp76lzh3rFzcHbmHVvQxYYpTw%3DckAlMINMjmCwxUcaXbAN4XqJVdgMJaHqNOFgPMK0zN1qLqLQCF';
const GUEST_ACTIVATE_URL = 'https://api.twitter.com/1.1/guest/activate.json';
const LOGIN_URL = 'https://api.twitter.com/1.1/onboarding/task.json';
const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 11; Nokia G20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36';

import setCookieParser from 'set-cookie-parser';

interface CookieEntry { key: string; value: string; }

function extractCookies(headers: Headers, cookies: CookieEntry[]): CookieEntry[] {
  const result = [...cookies];
  const setCookieHeaders = headers.getSetCookie?.() ?? [];
  for (const header of setCookieHeaders) {
    const parsed = setCookieParser.parse(header);
    for (const cookie of parsed) {
      const idx = result.findIndex((c) => c.key === cookie.name);
      const entry = { key: cookie.name, value: cookie.value };
      if (idx >= 0) result[idx] = entry;
      else result.push(entry);
    }
  }
  return result;
}

function buildHeaders(guestToken: string, cookies: CookieEntry[]): Record<string, string> {
  const ct0 = cookies.find((c) => c.key === 'ct0');
  return {
    authorization: `Bearer ${decodeURIComponent(BEARER_TOKEN)}`,
    'user-agent': USER_AGENT,
    'content-type': 'application/json',
    'x-guest-token': guestToken,
    'x-twitter-auth-type': 'OAuth2Client',
    'x-twitter-active-user': 'yes',
    'x-twitter-client-language': 'en',
    'x-csrf-token': ct0?.value ?? '',
    cookie: cookies.map((c) => `${c.key}=${c.value}`).join('; '),
  };
}

async function main() {
  let cookies: CookieEntry[] = [];

  // Step 1: Acquire guest token
  console.log('[debug] Step 1: Acquiring guest token...');
  const guestRes = await undiciFetch(GUEST_ACTIVATE_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${decodeURIComponent(BEARER_TOKEN)}`,
      'user-agent': USER_AGENT,
    },
    dispatcher,
  });
  console.log(`[debug] Guest token response: ${guestRes.status} ${guestRes.statusText}`);

  if (!guestRes.ok) {
    const body = await guestRes.text();
    console.log(`[debug] Response body: ${body.slice(0, 500)}`);
    return;
  }

  const guestData = await guestRes.json() as { guest_token: string };
  console.log(`[debug] Guest token: ${guestData.guest_token}`);

  // Step 2: Init login flow
  console.log('\n[debug] Step 2: Init login flow...');
  const loginRes = await undiciFetch(LOGIN_URL, {
    method: 'POST',
    headers: buildHeaders(guestData.guest_token, cookies),
    body: JSON.stringify({
      flow_name: 'login',
      input_flow_data: {
        flow_context: {
          debug_overrides: {},
          start_location: { location: 'splash_screen' },
        },
      },
    }),
    dispatcher,
  });

  console.log(`[debug] Login flow response: ${loginRes.status} ${loginRes.statusText}`);
  console.log(`[debug] Content-Type: ${loginRes.headers.get('content-type')}`);
  cookies = extractCookies(loginRes.headers, cookies);

  const loginBody = await loginRes.text();
  if (loginBody.startsWith('<')) {
    console.log(`[debug] Got HTML (Cloudflare block). First 300 chars:`);
    console.log(loginBody.slice(0, 300));
  } else {
    const data = JSON.parse(loginBody);
    console.log(`[debug] Flow token: ${data.flow_token}`);
    console.log(`[debug] Subtasks: ${JSON.stringify(data.subtasks?.map((s: any) => s.subtask_id))}`);
    console.log(`[debug] Cookies: ${cookies.map(c => c.key).join(', ')}`);
  }
}

main().catch(console.error);
