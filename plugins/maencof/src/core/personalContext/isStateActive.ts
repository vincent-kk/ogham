/**
 * @file isStateActive.ts
 * @description state 만료 판정 — render/prune/mutation이 공유하는 단일 규칙.
 *
 * 훅 도달 파일(render/prune)이 쓰므로 zod-free + Node builtins만. `expiresAt`
 * 파싱 불가(손편집 등)면 보수적으로 유지한다.
 */
import type { PersonalState } from '../../types/personalContext.js';

export function isStateActive(state: PersonalState, nowMs: number): boolean {
  const expiresMs = Date.parse(state.expiresAt);
  return Number.isNaN(expiresMs) || expiresMs > nowMs;
}
