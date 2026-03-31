# Twitter Indexer

Market intelligence service for AI trading agents. Scrapes Twitter/X, indexes tweets in PostgreSQL, and serves social signals via MCP so AI consumers can query influencer activity, token buzz, and market sentiment — without needing their own scraper or credentials.

## How It Works

```
Twitter/X  -->  Scraper  -->  PostgreSQL  -->  MCP Server  -->  AI Trading Agents
                  |                |
             Playwright       tsvector FTS
             (Cloudflare       (full-text
              bypass)           search)
```

**Scrapes** tweets from 21 crypto/political influencers and token keywords on a cron schedule. **Indexes** them with full-text search, token mention extraction, and sentiment scoring. **Serves** the data via MCP HTTP endpoint that any AI assistant can connect to.

## MCP Tools

Connect your AI agent to the MCP server and get these tools:

| Tool | Description |
|------|-------------|
| `search_tweets` | Full-text search across all indexed tweets |
| `get_influencer_tweets` | Recent tweets from a specific influencer |
| `get_latest_tweets` | Most recent indexed tweets across all sources |
| `get_token_mentions` | Tweets mentioning a token (BTC, SOL, ETH) with date range |
| `get_token_stats` | Mention count for a token over 1h/24h/7d |
| `get_influencer_list` | All watched influencers with follower stats |
| `get_trending` | Twitter trending topics |

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 15+
- Playwright browsers (`npx playwright install chromium`)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials (see Environment Variables below)

# Create database and run migrations
npm run db:migrate

# Start the service (scraper + API + MCP)
npm run dev
```

### Connect AI Agents

Start the MCP server:

```bash
npm run mcp   # HTTP mode on port 3001
```

Add to your AI tool's MCP config (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "twitter-indexer": {
      "type": "http",
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

If the server requires authentication:

```json
{
  "mcpServers": {
    "twitter-indexer": {
      "type": "http",
      "url": "http://localhost:3001/mcp",
      "headers": {
        "Authorization": "Bearer your-api-key"
      }
    }
  }
}
```

## Environment Variables

```bash
# Required
TWITTER_USERNAME=your_username
TWITTER_PASSWORD=your_password
TWITTER_EMAIL=your_email
DATABASE_URL=postgresql://postgres:password@localhost:5432/twitter_indexer
API_KEY=your-rest-api-key

# MCP Server
MCP_PORT=3001              # default: 3001
MCP_MODE=http              # http (default) or stdio
MCP_API_KEY=               # empty = public, set value = requires Bearer auth

# Telegram Alerts
ALERTS_ENABLED=true        # true (default) or false
TELEGRAM_BOT_TOKEN=        # enables alerts
TELEGRAM_CHAT_ID=          # optional, auto-detected on first message

# Optional
API_PORT=3000              # REST API port
CONFIG_DIR=./config        # YAML config directory
COOKIES_DIR=./.cookies     # cookie persistence
```

## Watched Influencers

Configured in `config/watchlist.yaml`. Currently tracking:

**Priority 1 (every crawl):** ThuanCapital, Donald Trump, Elon Musk, Michael Saylor, CZ Binance, Vitalik Buterin

**Priority 2:** Nayib Bukele, Sen. Lummis, David Sacks, Cathie Wood, Brian Armstrong

**Tokens:** BTC, SOL, ETH (with aliases)

**Keywords:** #crypto, #defi, #memecoins, #hacked, #exploit

## Schedule

| Job | Interval | What |
|-----|----------|------|
| Timeline | Every 10 min | Fetch influencer tweets |
| Search | Every 15 min | Search token keywords |
| Trends | Every hour | Fetch trending topics |

## Alerts

Telegram alerts fire on three triggers:

- **Influencer post** — priority 1-2 influencers tweet
- **Mention spike** — token mentions jump 200%+ in 1 hour
- **Keyword match** — tweets containing "listing", "airdrop", "hack", "exploit" from accounts with 10K+ followers

## Architecture

TypeScript monolith with clean internal modules. Two scraping modes:

- **Node fetch** for UserTweets, profiles, trends (direct GraphQL with cookie auth)
- **Playwright browser** for login (Cloudflare bypass) and search (requires browser-generated headers)

See `docs/architecture.md` for detailed diagrams and design decisions.

## Maintenance

Twitter periodically revokes bearer tokens and changes GraphQL query IDs:

```bash
npx tsx scripts/get-bearer.ts      # refresh bearer token
npx tsx scripts/get-query-ids.ts   # refresh query IDs
```

Update the extracted values in `src/scraper/endpoints.ts`.

## Development

```bash
npm run dev                         # dev server (hot reload)
npx tsc --noEmit                    # type-check
npm test                            # run all tests
npx vitest run tests/path/file.ts   # single test file
npm run mcp                         # MCP server (HTTP)
npm run mcp:stdio                   # MCP server (stdio)
```

## License

Private
