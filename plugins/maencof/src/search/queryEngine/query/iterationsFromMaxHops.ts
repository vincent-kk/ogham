/**
 * @file iterationsFromMaxHops.ts
 * @description maxHops(v1 반경 의미론)를 QGA 반복 횟수 T로 매핑한다.
 * kg_context 프리셋 대응: FOCUSED(3)→2, BALANCED(5)→3, BROAD(7)→4.
 */
export function iterationsFromMaxHops(maxHops: number): number {
  if (maxHops <= 3) return 2;
  if (maxHops >= 7) return 4;
  return 3;
}
