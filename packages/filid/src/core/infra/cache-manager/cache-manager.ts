// cache-manager.ts — slim facade
//
// 주의: TypeScript의 `export *`는 type-only 심볼을 forwarding 하지 않는다.
// FractalMap 타입은 명시적 `export type { FractalMap }`으로 별도 재노출한다.

export * from './caches/prompt-context-cache.js';
export * from './caches/session-cache.js';
export * from './caches/boundary-cache.js';
export * from './caches/fractal-map-cache.js';
export * from './caches/run-hash-cache.js';
export * from './caches/guide-cache.js';
export type { FractalMap } from './caches/fractal-map-cache.js';
