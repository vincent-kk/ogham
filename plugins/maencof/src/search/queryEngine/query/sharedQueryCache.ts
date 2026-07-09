/**
 * @file sharedQueryCache.ts
 * @description 모듈 수준 쿼리 캐시 싱글턴 — query 와 invalidateQueryCache 가 공유한다.
 */
import { QueryCache } from '../queryCache/index.js';

export const sharedQueryCache = new QueryCache();
