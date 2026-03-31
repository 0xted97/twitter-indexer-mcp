import { describe, it, expect } from 'vitest';
import { loadWatchlist, loadSchedule, loadAlerts } from '../src/config/loader.js';
import path from 'node:path';

const configDir = path.resolve(import.meta.dirname, '../../config');

describe('config loader', () => {
  it('loads and validates watchlist.yaml', () => {
    const watchlist = loadWatchlist(path.join(configDir, 'watchlist.yaml'));
    expect(watchlist.influencers.length).toBeGreaterThan(0);
    expect(watchlist.influencers[0]).toHaveProperty('username');
    expect(watchlist.influencers[0]).toHaveProperty('priority');
    expect(watchlist.tokens.length).toBeGreaterThan(0);
    expect(watchlist.tokens[0]).toHaveProperty('symbol');
    expect(watchlist.tokens[0]).toHaveProperty('aliases');
  });

  it('loads and validates schedule.yaml', () => {
    const schedule = loadSchedule(path.join(configDir, 'schedule.yaml'));
    expect(schedule.jobs.timeline).toHaveProperty('interval');
    expect(schedule.jobs.timeline).toHaveProperty('batch_size');
  });

  it('loads and validates alerts.yaml', () => {
    const alerts = loadAlerts(path.join(configDir, 'alerts.yaml'));
    expect(alerts.rules.length).toBeGreaterThan(0);
    expect(alerts.rules[0]).toHaveProperty('name');
    expect(alerts.rules[0]).toHaveProperty('trigger');
  });

  it('throws on invalid watchlist', () => {
    expect(() => loadWatchlist('/nonexistent.yaml')).toThrow();
  });
});
