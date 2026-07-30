import { describe, expect, it } from 'vitest';

import { CachedAtSchema } from '../types/cache.js';

// --- CachedAtSchema ---

describe('CachedAtSchema', () => {
  it('parses valid cached_at object', () => {
    const result = CachedAtSchema.safeParse({
      cached_at: '2024-01-01T00:00:00.000Z',
      ttl_hours: 24,
    });
    expect(result.success).toBe(true);
  });

  it('uses default ttl_hours when omitted', () => {
    const result = CachedAtSchema.safeParse({
      cached_at: '2024-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.ttl_hours).toBe(24);
  });

  it('can check expiry with ttl_hours', () => {
    const past = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const result = CachedAtSchema.safeParse({ cached_at: past, ttl_hours: 24 });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const cachedMs = new Date(result.data.cached_at).getTime();
    const expiresMs = cachedMs + result.data.ttl_hours * 60 * 60 * 1000;
    expect(expiresMs).toBeLessThan(Date.now());
  });

  it('rejects zero ttl_hours', () => {
    const result = CachedAtSchema.safeParse({
      cached_at: '2024-01-01T00:00:00.000Z',
      ttl_hours: 0,
    });
    expect(result.success).toBe(false);
  });
});
