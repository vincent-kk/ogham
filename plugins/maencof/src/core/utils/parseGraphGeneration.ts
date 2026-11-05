import type { SerializedGraphMeta } from '../../types/graph.js';

/**
 * @param raw 고정 commit marker의 JSON. 파싱 오류는 호출자의 오류 경계에 전파한다.
 * @returns 경로 구성에 안전한 세대 마커, 또는 구포맷/미완 마커이면 null.
 */
export function parseGraphGeneration(raw: string): SerializedGraphMeta | null {
  const meta = JSON.parse(raw) as Partial<SerializedGraphMeta> | null;
  if (
    !meta ||
    meta.schemaVersion !== 3 ||
    typeof meta.generation !== 'string' ||
    !/^[a-zA-Z0-9_-]+$/.test(meta.generation)
  )
    return null;
  return meta as SerializedGraphMeta;
}
