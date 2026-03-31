import type { AlertRule } from '../config/types.js';

export interface AlertContext {
  trigger: string;
  priority?: number;
  username?: string;
  text?: string;
  keyword?: string;
  symbol?: string;
  increase_pct?: number;
  followers?: number;
}

export function evaluateRules(rules: AlertRule[], context: AlertContext): AlertRule[] {
  return rules.filter((rule) => {
    if (rule.trigger !== context.trigger) return false;

    const cond = rule.condition;

    if (cond.priority && context.priority !== undefined) {
      if (!cond.priority.includes(context.priority)) return false;
    }

    if (cond.keywords && context.keyword) {
      if (!cond.keywords.includes(context.keyword)) return false;
    }

    if (cond.min_followers && context.followers !== undefined) {
      if (context.followers < cond.min_followers) return false;
    }

    if (cond.min_increase_pct && context.increase_pct !== undefined) {
      if (context.increase_pct < cond.min_increase_pct) return false;
    }

    return true;
  });
}

export function formatMessage(
  template: string,
  vars: Record<string, string | number | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}
