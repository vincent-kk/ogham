/**
 * @file deriveContextSeeds.ts
 * @description kg_context 자연어 query 를 시드 목록으로 분해한다 — 개별 단어(OR, recall 보존) +
 * 인접 2-gram(phrase 시드) 병행. 2-gram 은 AND 교집합·연속성 보너스(classifyMultiToken)를
 * 경유해 두 단어를 모두 담은 문서만 정밀 anchor 로 승격시키며, 그 후보는 개별 단어
 * 후보의 부분집합이므로 union(recall)은 불변이다 (AND 강제 없음 — 분산 보존).
 */
export function deriveContextSeeds(rawQuery: string): string[] {
  const words = rawQuery.split(/\s+/).filter((w) => w.length > 0);
  const seeds = new Set<string>(words);
  for (let i = 0; i + 1 < words.length; i++)
    seeds.add(`${words[i]} ${words[i + 1]}`);

  return Array.from(seeds);
}
