/**
 * @file query-cache.ts
 * @description LRU 쿼리 결과 캐시 — 동일 쿼리 반복 시 SA 재실행 방지
 *
 * 무효화: graph builtAt 변경 시 전체 캐시 클리어.
 */
import type { QueryOptions, QueryResult } from './query-engine.js';

/** 캐시 항목 */
interface CacheEntry {
  result: QueryResult;
  accessedAt: number;
}

/**
 * 검색 쿼리 결과 LRU 캐시
 */
export class QueryCache {
  private readonly maxEntries: number;
  private readonly cache = new Map<string, CacheEntry>();
  private graphBuiltAt: string | null = null;

  constructor(maxEntries = 50) {
    this.maxEntries = maxEntries;
  }

  /**
   * 캐시 키 생성: seeds + options의 정규화된 문자열
   */
  private makeKey(seeds: string[], options: QueryOptions): string {
    const sortedSeeds = [...seeds].sort().join('|');
    const opts = JSON.stringify({
      maxResults: options.maxResults,
      decay: options.decay,
      threshold: options.threshold,
      maxHops: options.maxHops,
      layerFilter: options.layerFilter,
    });
    return `${sortedSeeds}::${opts}`;
  }

  /**
   * 캐시에서 결과 조회
   * graph builtAt이 변경되었으면 캐시를 무효화한다.
   */
  get(
    seeds: string[],
    options: QueryOptions,
    currentBuiltAt: string,
  ): QueryResult | null {
    if (this.graphBuiltAt !== currentBuiltAt) {
      this.clear();
      this.graphBuiltAt = currentBuiltAt;
      return null;
    }

    const key = this.makeKey(seeds, options);
    const entry = this.cache.get(key);
    if (!entry) return null;

    entry.accessedAt = Date.now();
    return entry.result;
  }

  /**
   * 결과를 캐시에 저장
   */
  set(
    seeds: string[],
    options: QueryOptions,
    currentBuiltAt: string,
    result: QueryResult,
  ): void {
    if (this.graphBuiltAt !== currentBuiltAt) {
      this.clear();
      this.graphBuiltAt = currentBuiltAt;
    }

    const key = this.makeKey(seeds, options);
    this.cache.set(key, { result, accessedAt: Date.now() });

    // LRU 초과 시 가장 오래된 항목 제거
    if (this.cache.size > this.maxEntries) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [k, v] of this.cache) {
        if (v.accessedAt < oldestTime) {
          oldestTime = v.accessedAt;
          oldestKey = k;
        }
      }
      if (oldestKey) this.cache.delete(oldestKey);
    }
  }

  /**
   * 전체 캐시 클리어 (CRUD 도구 호출 시에도 사용)
   */
  clear(): void {
    this.cache.clear();
    this.graphBuiltAt = null;
  }

  /** 캐시 크기 */
  get size(): number {
    return this.cache.size;
  }
}
