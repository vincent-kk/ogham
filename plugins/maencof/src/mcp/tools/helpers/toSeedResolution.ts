/**
 * @file toSeedResolution.ts
 * @description 입력 항목별 매칭 계수를 seedResolution 응답 메타로 분해한다 —
 * 계수 0 이 unresolved 다. kg_search/kg_context/kg_suggest_links 가 공유한다.
 */
import type { SeedResolution } from '../../../types/mcp.js';

/**
 * @param counts - 입력 항목 원문 → 어휘 매칭 건수 (0 = 미해석), 입력 순서 보존
 * @returns resolved 맵과 (미해석 존재 시에만) unresolved 목록
 */
export function toSeedResolution(
  counts: Record<string, number>,
): SeedResolution {
  // Object.create(null): 'constructor' 같은 프로토타입 이름의 항목도 키로 실려야 한다
  const resolved: Record<string, number> = Object.create(null);
  const unresolved: string[] = [];
  for (const [item, count] of Object.entries(counts))
    if (count > 0) resolved[item] = count;
    else unresolved.push(item);
  return { resolved, ...(unresolved.length > 0 && { unresolved }) };
}
