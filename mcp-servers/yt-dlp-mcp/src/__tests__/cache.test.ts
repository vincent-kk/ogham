import { describe, expect, it } from 'vitest';

import { TtlLruCache } from '@/cache/cache.js';

describe('TtlLruCache', () => {
  it('stores and retrieves within TTL', () => {
    let t = 0;
    const cache = new TtlLruCache<number>(10, 1000, () => t);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('expires entries past TTL', () => {
    let t = 0;
    const cache = new TtlLruCache<number>(10, 1000, () => t);
    cache.set('a', 1);
    t = 1001;
    expect(cache.get('a')).toBeUndefined();
  });

  it('evicts the least-recently-used entry past capacity', () => {
    const cache = new TtlLruCache<number>(2, 10_000, () => 0);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // bump 'a'
    cache.set('c', 3); // evicts 'b'
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });

  it('clear empties the cache', () => {
    const cache = new TtlLruCache<number>(10, 1000, () => 0);
    cache.set('a', 1);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
