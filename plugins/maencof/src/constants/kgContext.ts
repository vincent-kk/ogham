import type { KgContextScope } from '../types/mcpKg.js';

/**
 * kg_context scope 프리셋 — 의미론적 탐색 폭을 SA 내부 파라미터로 변환.
 * 'balanced' 는 scope 도입 이전 하드코딩 값과 동일해야 한다 (하위호환 계약).
 */
export const KG_CONTEXT_SCOPE_PRESETS: Record<
  KgContextScope,
  { threshold: number; maxHops: number }
> = {
  focused: { threshold: 0.1, maxHops: 3 },
  balanced: { threshold: 0.05, maxHops: 5 },
  broad: { threshold: 0.02, maxHops: 7 },
};
