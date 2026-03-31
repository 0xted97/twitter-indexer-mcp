import Fastify from 'fastify';
import { apiKeyAuth } from './auth.js';
import {
  searchTweets,
  getTweetsByUser,
  getTokenMentions,
  getWatchedUsers,
  getTokenMentionCount,
  buildPaginationParams,
} from '../db/queries.js';

interface AppOptions {
  apiKey: string;
}

export function buildApp(options: AppOptions) {
  const app = Fastify({ logger: true });

  // Auth hook
  app.addHook('onRequest', apiKeyAuth(options.apiKey));

  // Health
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Tweets
  app.get('/tweets', async (request) => {
    const { limit, offset, q, user, from, to } = request.query as Record<string, string>;
    const pagination = buildPaginationParams({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    if (q) {
      const data = await searchTweets(q, pagination);
      return { data, pagination };
    }

    if (user) {
      const data = await getTweetsByUser(user, pagination);
      return { data, pagination };
    }

    // Default: latest tweets
    const data = await searchTweets('*', pagination);
    return { data, pagination };
  });

  app.get('/tweets/search', async (request) => {
    const { q, limit, offset } = request.query as Record<string, string>;
    if (!q) return { data: [], pagination: { total: 0, limit: 50, offset: 0 } };

    const pagination = buildPaginationParams({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    const data = await searchTweets(q, pagination);
    return { data, pagination };
  });

  // Influencers
  app.get('/influencers', async () => {
    const data = await getWatchedUsers();
    return { data };
  });

  app.get('/influencers/:username/tweets', async (request) => {
    const { username } = request.params as { username: string };
    const { limit, offset } = request.query as Record<string, string>;
    const pagination = buildPaginationParams({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    const data = await getTweetsByUser(username, pagination);
    return { data, pagination };
  });

  // Tokens
  app.get('/tokens/:symbol/mentions', async (request) => {
    const { symbol } = request.params as { symbol: string };
    const { limit, offset, from, to } = request.query as Record<string, string>;
    const pagination = buildPaginationParams({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    const data = await getTokenMentions(symbol, pagination, { from, to });
    return { data, pagination };
  });

  app.get('/tokens/:symbol', async (request) => {
    const { symbol } = request.params as { symbol: string };
    const count1h = await getTokenMentionCount(symbol, 1);
    const count24h = await getTokenMentionCount(symbol, 24);
    const count7d = await getTokenMentionCount(symbol, 168);
    return {
      data: {
        symbol: symbol.toUpperCase(),
        mentions: { '1h': count1h, '24h': count24h, '7d': count7d },
      },
    };
  });

  // Trends
  app.get('/trends', async () => {
    return { data: [] };
  });

  return app;
}
