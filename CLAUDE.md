# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

- **Never run `git commit` or `git push`** — the user will handle all commits and pushes manually.
- Refer to `docs/architecture.md` for the full system architecture, module dependency flow, data flow, and design decisions.
- Refer to `docs/twitter-auth-notes.md` for Twitter authentication root causes and debugging.
- **Always kill background processes** (dev server, MCP server, ngrok, etc.) when done with them. Don't leave orphan processes running.

## Commands

```bash
# Dev server (hot reload)
npm run dev

# Type-check
npx tsc --noEmit

# Tests (vitest, 42 tests)
npm test                                    # run all
npx vitest run tests/scraper/client.test.ts # single file
npx vitest run -t "test name"              # single test by name

# Database
npm run db:generate                        # generate Drizzle migrations
npm run db:migrate                         # apply migrations

# Build & run production
npm run build && npm start

# MCP server
npm run mcp                                # HTTP mode on port 3001 (default)
npm run mcp:stdio                          # stdio mode (for local AI tool configs)

# Maintenance scripts (run with tsx)
npx tsx scripts/get-bearer.ts              # extract current bearer token from x.com
npx tsx scripts/get-query-ids.ts           # extract current GraphQL query IDs
npx tsx scripts/test-scrape.ts             # test scraping endpoints with saved cookies
npx tsx scripts/test-crawl.ts              # test full pipeline (scrape -> index -> DB)
```

## Environment Variables

Required in `.env`:
- `TWITTER_USERNAME`, `TWITTER_PASSWORD`, `TWITTER_EMAIL` — Twitter login credentials
- `API_KEY` — Fastify REST API authentication key
- `DATABASE_URL` — PostgreSQL connection string (e.g. `postgresql://postgres:password@localhost:5432/twitter_indexer`)

Optional:
- `TELEGRAM_BOT_TOKEN` — enables Telegram alerts (bot auto-detects chat ID if `TELEGRAM_CHAT_ID` is not set)
- `TELEGRAM_CHAT_ID` — explicit Telegram chat ID (optional, auto-detected on first message to bot)
- `ALERTS_ENABLED` — `true` (default) or `false` to disable all Telegram alerts
- `API_PORT` — REST API port (default 3000)
- `MCP_PORT` — MCP HTTP server port (default 3001)
- `MCP_MODE` — `http` (default) or `stdio`
- `MCP_API_KEY` — if set, requires `Authorization: Bearer <key>` on MCP requests; if empty/unset, MCP is public
- `CONFIG_DIR` — path to config YAML directory (default `./config`)
- `COOKIES_DIR` — path for cookie persistence (default `./.cookies`)

## Architecture

TypeScript monolith, single process. ESM modules (`"type": "module"`) with `.js` extensions in all imports.

**Purpose:** Market intelligence layer for AI trading agents. Scrapes Twitter/X, indexes data in PostgreSQL, and serves it via MCP HTTP endpoint so AI consumers can query social sentiment, influencer signals, and token buzz without needing their own scraper or credentials.

**Data pipeline:** Scrape (Twitter GraphQL) -> Index (parse + enrich + tsvector FTS) -> Store (PostgreSQL/Drizzle) -> Analyze (sentiment + spike) -> Alert (Telegram) -> Serve (REST API + MCP)

**Two scraping modes:**
- **Node fetch** — for UserTweets, UserByScreenName, Trends (direct GraphQL calls with cookie auth)
- **Playwright browser** — for login (Cloudflare bypass) and SearchTimeline (requires browser-generated `x-client-transaction-id` header)

**Two serving interfaces:**
- **REST API** (Fastify, port 3000) — API key auth, for direct HTTP consumers
- **MCP HTTP** (port 3001) — Streamable HTTP transport with session management, for AI assistants (Claude, Cursor, etc). Each client session gets its own McpServer + transport pair.

**Periodic maintenance:** Twitter periodically revokes the bearer token and changes GraphQL query IDs. Use `scripts/get-bearer.ts` and `scripts/get-query-ids.ts` to refresh values in `src/scraper/endpoints.ts`.

**Config-driven:** Watchlist (influencers/tokens/hashtags), cron schedule, and alert rules are all in `config/*.yaml` with Zod validation.

**Three cron jobs:** timeline (every 10min, fetches influencer tweets), search (every 15min, searches token keywords), trends (hourly).

**Tweet deduplication:** `tweetExists()` check before insert — only new tweets trigger alerts and token mention inserts. Existing tweets get engagement stats updated via upsert.

**Alert triggers:** `influencer_post` (priority-based), `mention_spike` (percentage threshold), `keyword_match` (word list). Alerts are disabled when `ALERTS_ENABLED=false`. Telegram chat ID auto-detects if not configured.

## Key Patterns

- All config types use Zod schemas in `src/config/types.ts`; YAML configs support `${ENV_VAR}` interpolation via `src/config/loader.ts`
- DB schema is Drizzle ORM in `src/db/schema.ts`; tweets table uses `search_vector` column with `to_tsvector()` for FTS, set on insert in `upsertTweet()`
- Twitter API response parsing lives in `TwitterClient.parseTimelineResponse()` — handles multiple response shapes (`timeline_v2` vs `timeline`, `core.screen_name` vs `legacy.screen_name`)
- MCP server creates a new `McpServer` instance per session (keyed by `mcp-session-id` header) to avoid "already connected" errors
- MCP tool results serialize with a custom `toJson()` replacer to handle BigInt values from PostgreSQL
- Rate limiting uses a token bucket per endpoint in `src/scraper/rate-limiter.ts`
- Cookie persistence in `.cookies/cookies.json` — login once, reuse across restarts
- Tests mock DB and Twitter client; no real network calls in test suite
- CrawlManager callback receives `ParsedTweet[]` — only new (deduplicated) tweets are passed to `handleAlerts`
