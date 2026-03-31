import fs from 'node:fs';
import path from 'node:path';
import { CookieJar } from 'tough-cookie';
import setCookieParser from 'set-cookie-parser';
import {
  BEARER_TOKEN,
  LOGIN_USER_AGENT,
  buildUserTweetsUrl,
  buildSearchUrl,
  buildUserByScreenNameUrl,
  buildTweetDetailUrl,
  TRENDS_URL,
} from './endpoints.js';
import { rateLimiters } from './rate-limiter.js';
import { loginViaBrowser } from './browser-login.js';
import { browserSearch } from './browser-fetch.js';
import type { ParsedTweet, ParsedUser, Trend, TimelineResponse } from './types.js';

interface CookieEntry {
  key: string;
  value: string;
  domain: string;
}

const COOKIES_DIR = process.env.COOKIES_DIR ?? path.join(process.cwd(), '.cookies');
const COOKIES_FILE = path.join(COOKIES_DIR, 'cookies.json');

export class TwitterClient {
  private cookieJar: CookieJar;
  private cookies: CookieEntry[] = [];
  private loggedIn = false;

  constructor() {
    this.cookieJar = new CookieJar();
  }

  isLoggedIn(): boolean {
    return this.loggedIn;
  }

  getBaseHeaders(): Record<string, string> {
    return {
      authorization: `Bearer ${decodeURIComponent(BEARER_TOKEN)}`,
      'user-agent': LOGIN_USER_AGENT,
      'content-type': 'application/json',
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': 'en',
    };
  }

  getAuthHeaders(): Record<string, string> {
    const ct0 = this.cookies.find((c) => c.key === 'ct0');
    return {
      ...this.getBaseHeaders(),
      'x-csrf-token': ct0?.value ?? '',
      'x-twitter-auth-type': 'OAuth2Session',
      cookie: this.cookies.map((c) => `${c.key}=${c.value}`).join('; '),
    };
  }

  getCookies(): CookieEntry[] {
    return [...this.cookies];
  }

  setCookies(cookies: CookieEntry[]): void {
    this.cookies = [...cookies];
    const hasCt0 = cookies.some((c) => c.key === 'ct0');
    const hasAuth = cookies.some((c) => c.key === 'auth_token');
    this.loggedIn = hasCt0 && hasAuth;
  }

  saveCookiesToDisk(): void {
    fs.mkdirSync(COOKIES_DIR, { recursive: true });
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(this.cookies, null, 2));
  }

  loadCookiesFromDisk(): boolean {
    try {
      const data = fs.readFileSync(COOKIES_FILE, 'utf-8');
      const cookies = JSON.parse(data) as CookieEntry[];
      this.setCookies(cookies);
      return true;
    } catch {
      return false;
    }
  }

  private extractCookies(response: Response): void {
    const setCookieHeaders = response.headers.getSetCookie?.() ?? [];
    for (const header of setCookieHeaders) {
      const parsed = setCookieParser.parse(header);
      for (const cookie of parsed) {
        const existing = this.cookies.findIndex((c) => c.key === cookie.name);
        const entry: CookieEntry = {
          key: cookie.name,
          value: cookie.value,
          domain: cookie.domain ?? '.twitter.com',
        };
        if (existing >= 0) {
          this.cookies[existing] = entry;
        } else {
          this.cookies.push(entry);
        }
      }
    }
  }

  async login(username: string, password: string, email: string): Promise<void> {
    // Step 1: Try loading saved cookies
    if (this.loadCookiesFromDisk()) {
      const valid = await this.verifyCredentials();
      if (valid) {
        this.loggedIn = true;
        return;
      }
    }

    // Step 2: Login via browser automation (bypasses Cloudflare)
    console.log('[twitter] Logging in via browser automation...');
    const cookies = await loginViaBrowser(username, password, email);

    if (cookies.length === 0) {
      throw new Error('Login failed: no cookies returned from browser');
    }

    this.setCookies(cookies);

    // Check we got the critical cookies from browser login
    const hasCt0 = cookies.some((c) => c.key === 'ct0');
    const hasAuth = cookies.some((c) => c.key === 'auth_token');
    if (!hasCt0 || !hasAuth) {
      throw new Error('Login failed: missing ct0 or auth_token cookies after browser login');
    }

    this.loggedIn = true;
    this.saveCookiesToDisk();
    console.log('[twitter] Login successful, cookies saved.');
  }

  private async verifyCredentials(): Promise<boolean> {
    try {
      // Use GraphQL endpoint to verify — the v1.1 endpoint may not be available on all domains
      const url = buildUserByScreenNameUrl('x');
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // --- Data fetching methods ---

  async getUserProfile(username: string): Promise<ParsedUser | null> {
    await rateLimiters.userProfile.waitForSlot();
    rateLimiters.userProfile.recordRequest();

    const url = buildUserByScreenNameUrl(username);
    const response = await fetch(url, { headers: this.getAuthHeaders() });
    if (!response.ok) return null;

    const data = (await response.json()) as any;
    const result = data?.data?.user?.result;
    const legacy = result?.legacy;
    const core = result?.core;
    const restId = result?.rest_id;
    if (!restId) return null;

    return {
      id: restId,
      username: core?.screen_name ?? legacy?.screen_name ?? '',
      displayName: core?.name ?? legacy?.name ?? '',
      bio: legacy?.description ?? '',
      followersCount: legacy?.followers_count ?? 0,
      followingCount: legacy?.friends_count ?? 0,
    };
  }

  async getUserTweets(userId: string, count: number): Promise<TimelineResponse> {
    await rateLimiters.userTweets.waitForSlot();
    rateLimiters.userTweets.recordRequest();

    const url = buildUserTweetsUrl(userId, count);
    const response = await fetch(url, { headers: this.getAuthHeaders() });
    if (!response.ok) return { tweets: [] };

    const data = (await response.json()) as any;
    return this.parseTimelineResponse(data);
  }

  async searchTweets(query: string, count: number, mode: 'Top' | 'Latest' = 'Latest'): Promise<TimelineResponse> {
    await rateLimiters.search.waitForSlot();
    rateLimiters.search.recordRequest();

    // SearchTimeline requires x-client-transaction-id header that only the browser generates.
    // Navigate to the search page in a real browser and intercept the response.
    const data = await browserSearch(query, mode);
    if (!data) return { tweets: [] };

    return this.parseTimelineResponse(data);
  }

  async getTrends(): Promise<Trend[]> {
    await rateLimiters.trends.waitForSlot();
    rateLimiters.trends.recordRequest();

    const response = await fetch(TRENDS_URL, { headers: this.getAuthHeaders() });
    if (!response.ok) return [];

    const data = (await response.json()) as any;
    const entries = data?.timeline?.instructions?.[1]?.addEntries?.entries ?? [];

    return entries
      .filter((e: any) => e?.content?.timelineModule?.items)
      .flatMap((e: any) =>
        e.content.timelineModule.items.map((item: any) => ({
          name: item?.item?.content?.trend?.name ?? '',
          tweetCount: item?.item?.content?.trend?.trendMetadata?.metaDescription
            ? parseInt(item.item.content.trend.trendMetadata.metaDescription.replace(/[^0-9]/g, ''), 10) || undefined
            : undefined,
        }))
      )
      .filter((t: Trend) => t.name);
  }

  private parseTimelineResponse(data: any): TimelineResponse {
    const instructions = data?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions
      ?? data?.data?.user?.result?.timeline_v2?.timeline?.instructions
      ?? data?.data?.user?.result?.timeline?.timeline?.instructions
      ?? [];

    const tweets: ParsedTweet[] = [];
    let nextCursor: string | undefined;

    for (const instruction of instructions) {
      // Collect entries from both TimelineAddEntries (array) and TimelinePinEntry (single)
      const entries = instruction?.entries ?? (instruction?.entry ? [instruction.entry] : []);
      for (const entry of entries) {
        // Cursor entries
        if (entry?.entryId?.startsWith('cursor-bottom')) {
          nextCursor = entry?.content?.value ?? entry?.content?.itemContent?.value;
          continue;
        }

        // Tweet entries
        const result =
          entry?.content?.itemContent?.tweet_results?.result ??
          entry?.content?.content?.tweetResult?.result;
        if (!result) continue;

        const legacy = result?.legacy ?? result?.tweet?.legacy;
        const userResult = result?.core?.user_results?.result
          ?? result?.tweet?.core?.user_results?.result;
        const userCore = userResult?.core;
        const userLegacy = userResult?.legacy;
        const restId = result?.rest_id ?? result?.tweet?.rest_id;

        if (!legacy || !restId) continue;

        // screen_name may be in core (new) or legacy (old)
        const username = userCore?.screen_name ?? userLegacy?.screen_name;

        const tweetType = legacy.in_reply_to_status_id_str
          ? 'reply'
          : legacy.retweeted_status_id_str
          ? 'retweet'
          : legacy.quoted_status_id_str
          ? 'quote'
          : 'tweet';

        // Views can be in result.views or legacy.ext_views
        const viewCount = result?.views?.count
          ?? legacy?.ext_views?.count;

        tweets.push({
          id: restId,
          userId: legacy.user_id_str ?? userResult?.rest_id ?? '',
          username,
          text: legacy.full_text ?? '',
          fullText: legacy.full_text ?? '',
          tweetType,
          replyToId: legacy.in_reply_to_status_id_str,
          quoteOfId: legacy.quoted_status_id_str,
          likes: legacy.favorite_count ?? 0,
          retweets: legacy.retweet_count ?? 0,
          replies: legacy.reply_count ?? 0,
          views: viewCount ? parseInt(viewCount, 10) : 0,
          mediaUrls: (legacy.entities?.media ?? []).map((m: any) => m.media_url_https),
          urls: (legacy.entities?.urls ?? []).map((u: any) => u.expanded_url),
          hashtags: (legacy.entities?.hashtags ?? []).map((h: any) => h.text),
          mentions: (legacy.entities?.user_mentions ?? []).map((m: any) => m.screen_name),
          tweetedAt: new Date(legacy.created_at ?? Date.now()),
        });
      }
    }

    return { tweets, nextCursor };
  }
}
