import cron from 'node-cron';
import type { Watchlist, Schedule } from '../config/types.js';
import type { TwitterClient } from '../scraper/client.js';
import type { ParsedTweet } from '../scraper/types.js';
import { runTimelineJob, runSearchJob, runTrendsJob } from './jobs.js';

export type OnTweetsCrawled = (tweets: ParsedTweet[], source: string) => Promise<void> | void;

export class CrawlManager {
  private tasks: cron.ScheduledTask[] = [];
  private client: TwitterClient;
  private watchlist: Watchlist;
  private schedule: Schedule;
  private onTweetsCrawled?: OnTweetsCrawled;

  constructor(
    client: TwitterClient,
    watchlist: Watchlist,
    schedule: Schedule,
    onTweetsCrawled?: OnTweetsCrawled
  ) {
    this.client = client;
    this.watchlist = watchlist;
    this.schedule = schedule;
    this.onTweetsCrawled = onTweetsCrawled;
  }

  start(): void {
    const { jobs } = this.schedule;

    // Timeline job
    this.tasks.push(
      cron.schedule(jobs.timeline.interval, async () => {
        try {
          console.log('[crawl] Starting timeline job...');
          const tweets = await runTimelineJob(
            this.client,
            this.watchlist,
            jobs.timeline.batch_size ?? 20
          );
          console.log(`[crawl] Timeline: indexed ${tweets.length} tweets`);
          await this.onTweetsCrawled?.(tweets, 'timeline');
        } catch (err) {
          console.error('[crawl] Timeline job failed:', err);
        }
      })
    );

    // Search job
    this.tasks.push(
      cron.schedule(jobs.search.interval, async () => {
        try {
          console.log('[crawl] Starting search job...');
          const tweets = await runSearchJob(
            this.client,
            this.watchlist,
            jobs.search.batch_size ?? 50
          );
          console.log(`[crawl] Search: indexed ${tweets.length} tweets`);
          await this.onTweetsCrawled?.(tweets, 'search');
        } catch (err) {
          console.error('[crawl] Search job failed:', err);
        }
      })
    );

    // Trends job
    this.tasks.push(
      cron.schedule(jobs.trends.interval, async () => {
        try {
          await runTrendsJob(this.client);
        } catch (err) {
          console.error('[crawl] Trends job failed:', err);
        }
      })
    );

    console.log('[crawl] Scheduler started');
    console.log(`  timeline: ${jobs.timeline.interval}`);
    console.log(`  search:   ${jobs.search.interval}`);
    console.log(`  trends:   ${jobs.trends.interval}`);
  }

  stop(): void {
    for (const task of this.tasks) {
      task.stop();
    }
    this.tasks = [];
    console.log('[crawl] Scheduler stopped');
  }

  updateWatchlist(watchlist: Watchlist): void {
    this.watchlist = watchlist;
  }
}
