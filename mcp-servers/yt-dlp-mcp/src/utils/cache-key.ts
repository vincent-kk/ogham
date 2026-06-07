import { createHash } from 'node:crypto';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}

/**
 * Deterministic cache key for `{tool, target, args}`. Argument order is
 * normalized so equivalent calls collapse to one entry.
 */
export function cacheKey(tool: string, target: string, args?: Record<string, unknown>): string {
  const argStr = args ? stableStringify(args) : '';
  const digest = createHash('sha1').update(`${tool}\n${target}\n${argStr}`).digest('hex').slice(0, 16);
  return `${tool}:${digest}`;
}
