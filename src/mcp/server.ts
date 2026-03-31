import 'dotenv/config';
import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import {
  searchTweets,
  getTweetsByUser,
  getTokenMentions,
  getWatchedUsers,
  getTokenMentionCount,
  getLatestTweets,
} from '../db/queries.js';

function toJson(data: unknown): string {
  return JSON.stringify(data, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
    2
  );
}

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'twitter-indexer',
    version: '0.1.0',
  });

  server.tool(
    'search_tweets',
    'Full-text search indexed tweets',
    {
      query: z.string().describe('Search query'),
      limit: z.number().optional().describe('Max results (default 50)'),
    },
    async ({ query, limit }) => {
      const data = await searchTweets(query, { limit });
      return { content: [{ type: 'text' as const, text: toJson(data) }] };
    }
  );

  server.tool(
    'get_influencer_tweets',
    'Get recent tweets from a watched influencer',
    {
      username: z.string().describe('Twitter username'),
      limit: z.number().optional().describe('Max results (default 50)'),
    },
    async ({ username, limit }) => {
      const data = await getTweetsByUser(username, { limit });
      return { content: [{ type: 'text' as const, text: toJson(data) }] };
    }
  );

  server.tool(
    'get_token_mentions',
    'Get tweets mentioning a crypto token',
    {
      symbol: z.string().describe('Token symbol (e.g. SOL, BTC)'),
      limit: z.number().optional().describe('Max results (default 50)'),
      from: z.string().optional().describe('Start date (ISO 8601)'),
      to: z.string().optional().describe('End date (ISO 8601)'),
    },
    async ({ symbol, limit, from, to }) => {
      const data = await getTokenMentions(symbol, { limit }, { from, to });
      return { content: [{ type: 'text' as const, text: toJson(data) }] };
    }
  );

  server.tool(
    'get_trending',
    'Get current Twitter trending topics',
    {},
    async () => {
      return { content: [{ type: 'text' as const, text: toJson({ trends: [] }) }] };
    }
  );

  server.tool(
    'get_influencer_list',
    'List all watched influencers with stats',
    {},
    async () => {
      const data = await getWatchedUsers();
      return { content: [{ type: 'text' as const, text: toJson(data) }] };
    }
  );

  server.tool(
    'get_token_stats',
    'Get mention count trends for a token',
    {
      symbol: z.string().describe('Token symbol (e.g. SOL, BTC)'),
      period: z.enum(['1h', '24h', '7d']).optional().describe('Time period (default 24h)'),
    },
    async ({ symbol, period }) => {
      const hours = period === '1h' ? 1 : period === '7d' ? 168 : 24;
      const count = await getTokenMentionCount(symbol, hours);
      return {
        content: [
          {
            type: 'text' as const,
            text: toJson({ symbol: symbol.toUpperCase(), period: period ?? '24h', mentions: count }),
          },
        ],
      };
    }
  );

  server.tool(
    'get_latest_tweets',
    'Get most recent indexed tweets across all sources',
    {
      limit: z.number().optional().describe('Max results (default 50)'),
    },
    async ({ limit }) => {
      const data = await getLatestTweets({ limit });
      return { content: [{ type: 'text' as const, text: toJson(data) }] };
    }
  );

  return server;
}

async function startStdio() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function startHttp(port: number) {
  const mcpApiKey = process.env.MCP_API_KEY;
  const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);

    // Only handle /mcp path
    if (url.pathname !== '/mcp') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found. Use /mcp endpoint.' }));
      return;
    }

    // API key auth (skip if MCP_API_KEY not set)
    if (mcpApiKey) {
      const authHeader = req.headers['authorization'] ?? '';
      const providedKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (providedKey !== mcpApiKey) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized. Provide Bearer token in Authorization header.' }));
        return;
      }
    }

    // Handle DELETE for session cleanup
    if (req.method === 'DELETE') {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId)!;
        await session.transport.handleRequest(req, res);
        sessions.delete(sessionId);
      } else {
        res.writeHead(404);
        res.end();
      }
      return;
    }

    // Extract session ID from header
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      // Existing session — reuse transport
      const session = sessions.get(sessionId)!;
      await session.transport.handleRequest(req, res);
      return;
    }

    // New session — create fresh server + transport
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) sessions.delete(sid);
    };

    await server.connect(transport);
    await transport.handleRequest(req, res);

    const sid = transport.sessionId;
    if (sid) {
      sessions.set(sid, { server, transport });
    }
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`[mcp] HTTP server listening on http://0.0.0.0:${port}/mcp`);
    if (mcpApiKey) {
      console.log(`[mcp] API key auth enabled`);
    } else {
      console.log(`[mcp] WARNING: No MCP_API_KEY set — server is unauthenticated`);
    }
  });
}

// Run standalone
const mode = process.env.MCP_MODE ?? 'http';
const mcpPort = parseInt(process.env.MCP_PORT ?? '3001', 10);

if (mode === 'stdio') {
  startStdio().catch(console.error);
} else {
  startHttp(mcpPort).catch(console.error);
}
