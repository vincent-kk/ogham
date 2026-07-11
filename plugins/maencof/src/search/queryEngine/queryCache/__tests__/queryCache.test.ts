/**
 * @file queryCache.test.ts
 * @description LRU 쿼리 캐시 키 — since/until 만 다른 옵션은 서로 다른 항목이어야 한다 (collision 방지).
 */
import { describe, expect, it } from 'vitest';

import type { QueryResult } from '../../types/types.js';
import { QueryCache } from '../queryCache.js';

function mkResult(exploredNodes: number): QueryResult {
  return { results: [], seedIds: [], exploredNodes, durationMs: 0 };
}

const BUILT_AT = 'graph-t';

describe('QueryCache — time-window key isolation', () => {
  it('options differing only by since do not collide', () => {
    const cache = new QueryCache();
    const a = mkResult(1);
    const b = mkResult(2);
    cache.set(['seed'], { since: '2026-01-01' }, BUILT_AT, a);
    cache.set(['seed'], { since: '2026-06-01' }, BUILT_AT, b);

    expect(cache.get(['seed'], { since: '2026-01-01' }, BUILT_AT)).toBe(a);
    expect(cache.get(['seed'], { since: '2026-06-01' }, BUILT_AT)).toBe(b);
  });

  it('options differing only by until do not collide', () => {
    const cache = new QueryCache();
    const a = mkResult(1);
    const b = mkResult(2);
    cache.set(['seed'], { until: '2026-01-01' }, BUILT_AT, a);
    cache.set(['seed'], { until: '2026-06-01' }, BUILT_AT, b);

    expect(cache.get(['seed'], { until: '2026-01-01' }, BUILT_AT)).toBe(a);
    expect(cache.get(['seed'], { until: '2026-06-01' }, BUILT_AT)).toBe(b);
  });

  it('identical options hit the same cache entry', () => {
    const cache = new QueryCache();
    const a = mkResult(1);
    cache.set(['seed'], { since: '2026-01-01' }, BUILT_AT, a);
    expect(cache.get(['seed'], { since: '2026-01-01' }, BUILT_AT)).toBe(a);
  });

  it('a no-window query stays isolated from a since-bounded one', () => {
    const cache = new QueryCache();
    const plain = mkResult(1);
    const bounded = mkResult(2);
    cache.set(['seed'], {}, BUILT_AT, plain);
    cache.set(['seed'], { since: '2026-01-01' }, BUILT_AT, bounded);

    expect(cache.get(['seed'], {}, BUILT_AT)).toBe(plain);
    expect(cache.get(['seed'], { since: '2026-01-01' }, BUILT_AT)).toBe(
      bounded,
    );
  });

  it('builtAt change invalidates prior entries', () => {
    const cache = new QueryCache();
    cache.set(['seed'], { since: '2026-01-01' }, BUILT_AT, mkResult(1));
    expect(cache.get(['seed'], { since: '2026-01-01' }, 'graph-t2')).toBeNull();
  });
});
