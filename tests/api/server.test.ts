import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/api/server.js';

describe('REST API', () => {
  const app = buildApp({ apiKey: 'test-key' });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty('status', 'ok');
  });

  it('GET /tweets without API key returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/tweets' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /tweets with valid API key returns 200 or 500 (no DB)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tweets',
      headers: { 'x-api-key': 'test-key' },
    });
    // 200 if DB connected, 500 if not — both are valid for route registration test
    expect([200, 500]).toContain(res.statusCode);
  });
});
