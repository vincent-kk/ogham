// cacheManager.ts — slim facade
//
// 주의: TypeScript의 `export *`는 type-only 심볼을 forwarding 하지 않는다.
// FractalMap 등 타입은 명시적 `export type { ... }`으로 별도 재노출한다.

export * from './caches/promptContextCache.js';
export * from './caches/sessionCache.js';
export * from './caches/boundaryCache.js';
export * from './caches/fractalMapCache.js';
export * from './caches/deliveredCache.js';
export * from './caches/turnCounter.js';
export * from './caches/runHashCache.js';
export * from './caches/guideCache.js';
export * from './caches/modeAuditCache.js';
export type { FractalMap, VisitScope } from './caches/fractalMapCache.js';
export type {
  DeliveredState,
  VisitArgs,
  VisitDecision,
} from './caches/fractalMapCache.js';
export type { ModeAuditEntry } from './caches/modeAuditCache.js';
