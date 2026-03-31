import 'dotenv/config';
import path from 'node:path';
import { TwitterClient } from './scraper/client.js';
import { CrawlManager } from './scheduler/crawl-manager.js';
import { buildApp } from './api/server.js';
import { TelegramAlerter } from './alerts/telegram.js';
import { evaluateRules, formatMessage, type AlertContext } from './alerts/rules.js';
import { loadWatchlist, loadSchedule, loadAlerts } from './config/loader.js';
import { scoreSentiment } from './analyzer/sentiment.js';
import { detectSpike } from './analyzer/spike-detector.js';
import { getTokenMentionCount } from './db/queries.js';
import { closeDb } from './db/connection.js';
import type { ParsedTweet } from './scraper/types.js';

const CONFIG_DIR = process.env.CONFIG_DIR ?? path.join(process.cwd(), 'config');

async function main() {
  console.log('[boot] Starting Twitter Indexer...');

  // Load configs
  const watchlist = loadWatchlist(path.join(CONFIG_DIR, 'watchlist.yaml'));
  const schedule = loadSchedule(path.join(CONFIG_DIR, 'schedule.yaml'));
  const alertsConfig = loadAlerts(path.join(CONFIG_DIR, 'alerts.yaml'));

  console.log(`[boot] Watching ${watchlist.influencers.length} influencers, ${watchlist.tokens.length} tokens`);

  // Init Twitter client
  const client = new TwitterClient();
  const { TWITTER_USERNAME, TWITTER_PASSWORD, TWITTER_EMAIL } = process.env;
  if (!TWITTER_USERNAME || !TWITTER_PASSWORD || !TWITTER_EMAIL) {
    throw new Error('TWITTER_USERNAME, TWITTER_PASSWORD, and TWITTER_EMAIL are required');
  }

  await client.login(TWITTER_USERNAME, TWITTER_PASSWORD, TWITTER_EMAIL);
  console.log('[boot] Twitter login successful');

  // Init Telegram alerter
  const alertsEnabled = (process.env.ALERTS_ENABLED ?? 'true').toLowerCase() !== 'false';
  let alerter: TelegramAlerter | undefined;
  if (alertsEnabled && alertsConfig.telegram.bot_token) {
    alerter = new TelegramAlerter(alertsConfig.telegram.bot_token, alertsConfig.telegram.chat_id || undefined);
    console.log('[boot] Telegram alerts enabled');
  } else {
    console.log(`[boot] Telegram alerts disabled${!alertsEnabled ? ' (ALERTS_ENABLED=false)' : ' (no bot token)'}`);
  }

  // Alert handler: called after tweets are indexed
  async function handleAlerts(tweets: ParsedTweet[], source: string) {
    if (!alerter) return;

    for (const tweet of tweets) {
      // Check influencer post alerts
      const influencer = watchlist.influencers.find(
        (i) => i.username.toLowerCase() === tweet.username?.toLowerCase()
      );
      if (influencer) {
        const context: AlertContext = {
          trigger: 'influencer_post',
          priority: influencer.priority,
          username: tweet.username,
          text: tweet.fullText,
        };
        const matched = evaluateRules(alertsConfig.rules, context);
        for (const rule of matched) {
          const msg = formatMessage(rule.message, {
            username: tweet.username,
            text: tweet.fullText,
          });
          await alerter.send(msg);
        }
      }

      // Check keyword alerts
      for (const rule of alertsConfig.rules.filter((r) => r.trigger === 'keyword_match')) {
        const keywords = rule.condition.keywords ?? [];
        const matchedKeyword = keywords.find((kw) =>
          tweet.fullText.toLowerCase().includes(kw.toLowerCase())
        );
        if (matchedKeyword) {
          const context: AlertContext = {
            trigger: 'keyword_match',
            keyword: matchedKeyword,
            username: tweet.username,
            text: tweet.fullText,
            followers: 0,
          };
          const matched = evaluateRules(alertsConfig.rules, context);
          for (const r of matched) {
            const msg = formatMessage(r.message, {
              keyword: matchedKeyword,
              username: tweet.username,
              text: tweet.fullText,
            });
            await alerter.send(msg);
          }
        }
      }
    }

    // Check token spike alerts
    for (const token of watchlist.tokens) {
      const currentCount = await getTokenMentionCount(token.symbol, 1);
      const avgCount = (await getTokenMentionCount(token.symbol, 24)) / 24;

      const spikeRules = alertsConfig.rules.filter((r) => r.trigger === 'mention_spike');
      for (const rule of spikeRules) {
        const spike = detectSpike({
          currentCount,
          averageCount: avgCount,
          thresholdPct: rule.condition.min_increase_pct ?? 200,
        });

        if (spike.isSpike) {
          const msg = formatMessage(rule.message, {
            symbol: token.symbol,
            increase_pct: spike.increasePct,
          });
          await alerter.send(msg);
        }
      }
    }
  }

  // Start crawler
  const crawler = new CrawlManager(client, watchlist, schedule, async (tweets, source) => {
    console.log(`[alerts] Evaluating ${tweets.length} tweets from ${source}...`);
    await handleAlerts(tweets, source);
  });
  crawler.start();

  // Start REST API
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error('API_KEY is required');

  const apiPort = parseInt(process.env.API_PORT ?? '3000', 10);
  const app = buildApp({ apiKey });
  await app.listen({ port: apiPort, host: '0.0.0.0' });
  console.log(`[boot] REST API listening on port ${apiPort}`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[shutdown] Stopping...');
    crawler.stop();
    await app.close();
    await closeDb();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
