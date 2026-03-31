import fs from 'node:fs';
import yaml from 'js-yaml';
import {
  WatchlistSchema,
  ScheduleSchema,
  AlertsConfigSchema,
  type Watchlist,
  type Schedule,
  type AlertsConfig,
} from './types.js';

function loadYaml(filePath: string): unknown {
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(content);
}

function resolveEnvVars(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] ?? '');
  }
  if (Array.isArray(obj)) return obj.map(resolveEnvVars);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, resolveEnvVars(v)])
    );
  }
  return obj;
}

export function loadWatchlist(filePath: string): Watchlist {
  const raw = loadYaml(filePath);
  return WatchlistSchema.parse(raw);
}

export function loadSchedule(filePath: string): Schedule {
  const raw = loadYaml(filePath);
  return ScheduleSchema.parse(raw);
}

export function loadAlerts(filePath: string): AlertsConfig {
  const raw = loadYaml(filePath);
  const resolved = resolveEnvVars(raw);
  return AlertsConfigSchema.parse(resolved);
}
