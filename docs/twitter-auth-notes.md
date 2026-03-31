# Twitter/X Authentication — Root Cause Analysis & Notes

## Problem

Twitter login via the internal API (`POST /1.1/onboarding/task.json`) fails with **403 Forbidden** from Cloudflare. The response is an HTML error page instead of JSON.

## Root Causes

### 1. Cloudflare TLS Fingerprinting

Twitter/X uses Cloudflare to protect certain endpoints. Cloudflare identifies automated clients by their TLS fingerprint (JA3 hash). Node.js's default TLS cipher suite produces a recognizable non-browser fingerprint, which gets blocked.

- The **guest token endpoint** (`/1.1/guest/activate.json`) is NOT blocked
- The **login flow endpoint** (`/1.1/onboarding/task.json`) IS blocked
- The **GraphQL data endpoints** (`/i/api/graphql/...`) are NOT blocked (when using valid session cookies)

Approaches like TLS cipher randomization (used by `agent-twitter-client`) no longer reliably bypass this.

### 2. Outdated Bearer Token

The bearer token hardcoded in `agent-twitter-client` and many scrapers is:
```
AAAAAAAAAAAAAAAAAAAAAFQODgEAAAAAVHTp76lzh3rFzcHbmHVvQxYYpTw%3DckAlMINMjmCwxUcaXbAN4XqJVdgMJaHqNOFgPMK0zN1qLqLQCF
```

This token has been **revoked**. The current working bearer token (as of 2026-03-29) is:
```
AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA
```

The bearer token can be extracted by intercepting network requests on x.com (see `scripts/get-bearer.ts`).

### 3. Domain Migration (twitter.com -> x.com)

- Cookies from browser login are set on `.x.com` domain
- The old `api.twitter.com` v1.1 REST endpoints (like `/1.1/account/verify_credentials.json`) return 404 on `api.x.com`
- GraphQL endpoints work on all domains (`x.com`, `twitter.com`, `api.twitter.com`) as long as cookies are valid

## Solution: Browser-Based Login

We use **Playwright** (headless Chromium) to perform login through the real X website:

1. Launch Chromium with anti-detection measures:
   - `--disable-blink-features=AutomationControlled`
   - Override `navigator.webdriver` to return `false`
   - Desktop Chrome user-agent string
   - Human-like typing delays (50-120ms per character)
   - Random delays between actions

2. Navigate to `https://x.com/i/flow/login`
3. Fill username, handle email challenge if prompted, fill password
4. Wait for redirect to `/home`
5. Extract cookies from browser context
6. Save cookies to disk (`.cookies/cookies.json`)

On subsequent runs, saved cookies are loaded and verified via a GraphQL call. Browser login only runs when cookies are missing or expired.

## Key Files

| File | Purpose |
|------|---------|
| `src/scraper/browser-login.ts` | Playwright-based login flow |
| `src/scraper/client.ts` | TwitterClient with cookie management |
| `src/scraper/endpoints.ts` | Bearer token, GraphQL query IDs, URL builders |
| `scripts/test-login.ts` | Manual login test script |
| `scripts/get-bearer.ts` | Extract current bearer token from x.com |

## Known Limitations

- **Login rate limiting**: Twitter blocks repeated login attempts from the same account/IP. Wait 5-15 minutes between retries.
- **Bearer token rotation**: Twitter may change the bearer token at any time. Use `scripts/get-bearer.ts` to get the current one.
- **Cookie expiry**: Session cookies last weeks/months but will eventually expire, triggering a browser re-login.
- **Headless detection**: Some environments may need `BROWSER_HEADLESS=false` for the first login.

## Debugging

Screenshots are saved to `.debug/` directory during login:
- `01-login-page.png` — Initial login page
- `02-username-filled.png` — After entering username
- `03-after-next.png` — After clicking Next (check for error banners)
- `05-password-filled.png` — After entering password
- `07-logged-in.png` — Home feed (login success)
- `error-state.png` — State at time of failure
