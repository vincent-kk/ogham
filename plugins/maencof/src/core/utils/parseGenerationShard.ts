/**
 * @param raw 동기 훅 읽기와 비동기 저장소 읽기가 공유하는 세대별 샤드 JSON.
 * @param generation 마커가 지정한 세대 식별자.
 * @returns 해당 세대의 배열. 손상·세대 불일치는 throw하여 전체 읽기를 중단한다.
 */
export function parseGenerationShard<T>(raw: string, generation: string): T[] {
  const shard = JSON.parse(raw) as {
    generation?: unknown;
    data?: unknown;
  } | null;
  if (!shard || shard.generation !== generation || !Array.isArray(shard.data))
    throw new Error('Graph shard generation mismatch');
  return shard.data as T[];
}
