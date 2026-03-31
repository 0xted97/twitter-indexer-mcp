import { z } from 'zod';

export const InfluencerSchema = z.object({
  username: z.string(),
  priority: z.number().int().min(1).max(10).default(5),
});

export const TokenSchema = z.object({
  symbol: z.string(),
  aliases: z.array(z.string()).default([]),
});

export const WatchlistSchema = z.object({
  influencers: z.array(InfluencerSchema).default([]),
  tokens: z.array(TokenSchema).default([]),
  hashtags: z.array(z.string()).default([]),
});

export const JobConfigSchema = z.object({
  interval: z.string(),
  batch_size: z.number().int().positive().optional(),
});

export const ScheduleSchema = z.object({
  jobs: z.object({
    timeline: JobConfigSchema,
    search: JobConfigSchema,
    trends: JobConfigSchema,
  }),
});

export const AlertConditionSchema = z.object({
  priority: z.array(z.number()).optional(),
  min_increase_pct: z.number().optional(),
  window: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  min_followers: z.number().optional(),
});

export const AlertRuleSchema = z.object({
  name: z.string(),
  trigger: z.enum(['influencer_post', 'mention_spike', 'keyword_match']),
  condition: AlertConditionSchema,
  message: z.string(),
});

export const AlertsConfigSchema = z.object({
  telegram: z.object({
    bot_token: z.string(),
    chat_id: z.string().optional().default(''),
  }),
  rules: z.array(AlertRuleSchema).default([]),
});

export type Influencer = z.infer<typeof InfluencerSchema>;
export type Token = z.infer<typeof TokenSchema>;
export type Watchlist = z.infer<typeof WatchlistSchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type AlertRule = z.infer<typeof AlertRuleSchema>;
export type AlertsConfig = z.infer<typeof AlertsConfigSchema>;
