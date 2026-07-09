/**
 * @file invalidateQueryCache.ts
 * @description 쿼리 캐시를 무효화한다 (CRUD 도구 호출 시 사용).
 */
import { sharedQueryCache } from './sharedQueryCache.js';

export function invalidateQueryCache(): void {
  sharedQueryCache.clear();
}
