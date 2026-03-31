# Twitter Indexer — Architecture

## High-Level Overview

```
                         +------------------+
                         |   config/*.yaml  |
                         |  (watchlist,     |
                         |   schedule,      |
                         |   alerts)        |
                         +--------+---------+
                                  |
                                  v
+----------------+      +--------+---------+      +------------------+
|   Twitter/X    |<---->|    Scheduler      |----->|   PostgreSQL     |
|   (GraphQL     |      |  (node-cron)      |      |   (Drizzle ORM)  |
|    API)        |      |                   |      |                  |
+-------+--------+      | - Timeline Job   |      | - tweets         |
        ^               | - Search Job     |      | - users          |
        |               | - Trends Job     |      | - token_mentions |
        |               +--------+---------+      | - FTS (tsvector) |
        |                        |                 +--------+---------+
        |                        v                          |
+-------+--------+      +-------+----------+               |
|   Playwright   |      |    Indexer        |               |
|   (Browser     |      | - Parser         |               |
|    Login &     |      | - Enricher       |               |
|    Search)     |      |   (token detect) |               |
+----------------+      +-------+----------+               |
                                 |                          |
                                 v                          |
                        +--------+---------+               |
                        |    Analyzer       |               |
                        | - Sentiment       |               |
                        | - Spike Detector  |               |
                        +--------+---------+               |
                                 |                          |
                                 v                          |
                        +--------+---------+               |
                        |    Alerts         |               |
                        | - Rules Engine    |               |
                        | - Telegram Bot    |-----> Telegram
                        +------------------+
                                                           |
                        +------------------+               |
                        |    REST API       |<--------------+
                        |   (Fastify:3000)  |
                        | - /health         |
                        | - /tweets         |
                        | - /tweets/search  |
                        | - /influencers    |
                        | - /tokens/:symbol |
                        | - /trends         |
                        +------------------+
                                                           |
                        +------------------+               |
                        |    MCP Server     |<--------------+
                        |   (stdio)         |
                        | - search_tweets   |
                        | - get_influencer  |
                        | - get_token_stats |
                        | - get_trending    |
                        +------------------+
```

## Module Dependency Flow

```
index.ts (entry point)
  |
  +-- config/loader.ts -----> config/types.ts (Zod schemas)
  |     reads: config/*.yaml
  |
  +-- scraper/client.ts -----> scraper/endpoints.ts (GraphQL URLs, bearer token)
  |     |                      scraper/rate-limiter.ts (token bucket)
  |     |                      scraper/browser-login.ts (Playwright login)
  |     |                      scraper/browser-fetch.ts (Playwright search intercept)
  |     |
  |     +-- Fetches: profiles, tweets, search results, trends
  |
  +-- scheduler/crawl-manager.ts --> scheduler/jobs.ts
  |     |                              |
  |     |  cron schedules:             +-- indexer/parser.ts (tweet -> DB record)
  |     |  - timeline: */10 * * * *    +-- indexer/enricher.ts ($TOKEN detection)
  |     |  - search:   */15 * * * *    +-- db/queries.ts (upsert, search, counts)
  |     |  - trends:   0 * * * *
  |     |
  |     +-- db/connection.ts ---------> PostgreSQL (via pg + drizzle)
  |           db/schema.ts                db/queries.ts
  |
  +-- analyzer/sentiment.ts (bullish/bearish scoring)
  +-- analyzer/spike-detector.ts (mention spike %)
  |
  +-- alerts/rules.ts (rule matching + message templates)
  +-- alerts/telegram.ts (grammy bot, rate-limited)
  |
  +-- api/server.ts (Fastify REST API)
  |     api/auth.ts (x-api-key middleware)
  |
  +-- mcp/server.ts (MCP stdio server, 7 tools)
```

## Data Flow

```
1. SCRAPE
   Twitter GraphQL API  --->  ParsedTweet[]
   (via Node fetch or Playwright browser)

2. INDEX
   ParsedTweet  --->  parseTweetForDb()  --->  upsertTweet(DB)
                       extractTokenMentions()  --->  insertTokenMention(DB)
                       upsertUser(DB)

3. ANALYZE
   tweet.fullText  --->  scoreSentiment()  --->  sentiment score (-1 to +1)
   getTokenMentionCount()  --->  detectSpike()  --->  { isSpike, increasePct }

4. ALERT
   context  --->  evaluateRules()  --->  matched rules
                  formatMessage()  --->  telegram.send()

5. SERVE
   DB queries  <---  REST API  <---  HTTP client
   DB queries  <---  MCP Server  <---  AI assistant (Claude, etc.)
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Playwright for login** | Twitter's Cloudflare blocks API-based login (TLS fingerprinting) |
| **Playwright for search** | SearchTimeline requires `x-client-transaction-id` header only generated by browser JS |
| **Node fetch for other APIs** | UserTweets, UserByScreenName, Trends work fine via direct API calls |
| **Bearer token in code** | Twitter's public bearer token, extracted from x.com. Needs periodic refresh |
| **GraphQL query IDs in code** | Twitter changes these periodically. `scripts/get-query-ids.ts` to refresh |
| **PostgreSQL + tsvector** | Full-text search on tweet content without external search engine |
| **Drizzle ORM** | Type-safe schema, lightweight, good DX |
| **Cookie persistence** | `.cookies/cookies.json` — login once, reuse across restarts |
| **Monolith architecture** | Single process, clean internal modules, simpler deployment |

## File Structure

```
twitter-indexer/
  src/
    index.ts                  # Entry point, bootstraps all modules
    config/
      types.ts                # Zod schemas for YAML configs
      loader.ts               # YAML loader with env var resolution
    scraper/
      client.ts               # TwitterClient (login, fetch, parse)
      endpoints.ts            # Bearer token, query IDs, URL builders
      rate-limiter.ts         # Token bucket rate limiter
      browser-login.ts        # Playwright-based Twitter login
      browser-fetch.ts        # Playwright-based search intercept
      types.ts                # RawTweet, ParsedTweet, etc.
    db/
      schema.ts               # Drizzle schema (users, tweets, token_mentions)
      connection.ts           # Singleton PG pool
      queries.ts              # DB query builders
    indexer/
      parser.ts               # ParsedTweet -> DB record
      enricher.ts             # Token mention extraction
    analyzer/
      sentiment.ts            # Bullish/bearish word scoring
      spike-detector.ts       # Mention spike detection
    alerts/
      rules.ts                # Alert rule matching + templates
      telegram.ts             # Telegram bot (grammy)
    scheduler/
      jobs.ts                 # Timeline, search, trends jobs
      crawl-manager.ts        # Cron scheduler
    api/
      server.ts               # Fastify REST API
      auth.ts                 # API key middleware
    mcp/
      server.ts               # MCP stdio server (7 tools)
  config/
    watchlist.yaml            # Influencers, tokens, hashtags
    schedule.yaml             # Cron intervals
    alerts.yaml               # Alert rules + Telegram config
  scripts/
    test-login.ts             # Manual login test
    test-scrape.ts            # Test scraping endpoints
    test-crawl.ts             # Test full pipeline
    get-bearer.ts             # Extract current bearer token
    get-query-ids.ts          # Extract current GraphQL query IDs
  drizzle/
    0001_add_search_vector.sql  # FTS migration
  tests/                      # 42 tests (vitest)
  docs/
    twitter-auth-notes.md     # Auth debugging notes
    architecture.md           # This file
```
