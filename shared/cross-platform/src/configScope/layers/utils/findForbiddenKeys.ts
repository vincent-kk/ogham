import { FORBIDDEN_KEYS, isPlainObject } from "../../merge/index.js";

/**
 * 문서 어디든 own key로 존재하는 `FORBIDDEN_KEYS`의 dot path를 모은다.
 *
 * 읽기 계층은 원문을 정화하지 않는다. 걸러내는 지점은 병합 한 곳이다. 다만
 * 사용자가 이 키를 의도적으로 썼을 리 없으므로, 조용히 무시하는 대신
 * "이 키는 병합에서 버렸다"고 경고로 알린다.
 */
export function findForbiddenKeys(
  document: Record<string, unknown>,
): readonly string[] {
  const found: string[] = [];
  const walk = (node: Record<string, unknown>, prefix: string): void => {
    for (const key of Object.keys(node)) {
      const path = prefix === "" ? key : `${prefix}.${key}`;
      if (FORBIDDEN_KEYS.has(key)) {
        found.push(path);
        continue;
      }
      const value = node[key];
      if (isPlainObject(value)) walk(value, path);
    }
  };
  walk(document, "");
  return found;
}
