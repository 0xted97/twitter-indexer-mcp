import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TwitterClient } from '../src/scraper/client.js';

describe('TwitterClient', () => {
  let client: TwitterClient;

  beforeEach(() => {
    client = new TwitterClient();
  });

  it('starts as not logged in', () => {
    expect(client.isLoggedIn()).toBe(false);
  });

  it('builds auth headers with bearer token', () => {
    const headers = client.getBaseHeaders();
    expect(headers['authorization']).toMatch(/^Bearer /);
  });

  it('can set and get cookies', () => {
    client.setCookies([
      { key: 'ct0', value: 'test_csrf', domain: '.twitter.com' },
      { key: 'auth_token', value: 'test_auth', domain: '.twitter.com' },
    ]);
    const cookies = client.getCookies();
    expect(cookies).toHaveLength(2);
  });

  it('extracts csrf token from ct0 cookie', () => {
    client.setCookies([
      { key: 'ct0', value: 'my_csrf_token', domain: '.twitter.com' },
    ]);
    const headers = client.getAuthHeaders();
    expect(headers['x-csrf-token']).toBe('my_csrf_token');
  });
});
