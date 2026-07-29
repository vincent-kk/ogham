import { FORBIDDEN_KEYS } from "./forbiddenKeys.js";
import { isPlainObject } from "./isPlainObject.js";

/**
 * 한 dot path segment 열을 지운 새 문서를 반환한다. 지울 것이 없으면 입력
 * 참조를 그대로 돌려준다.
 *
 * 삭제로 비어버린 상위 객체는 함께 제거한다 — 빈 껍데기가 남으면
 * `listOverriddenPaths`가 그것을 리프로 세어 "재정의됨" 배지가 사라지지 않는다.
 */
export function removePath(
  node: Record<string, unknown>,
  segments: readonly string[],
): Record<string, unknown> {
  const [head, ...rest] = segments;
  // hasOwn이어야 한다. `in`은 프로토타입 체인을 보므로 `"constructor" in {}`가
  // true가 되어 없는 키를 지우려 든다.
  if (head === undefined || !Object.hasOwn(node, head)) return node;
  // `next[head] = pruned` 대입이 프로토타입 설정자를 때리는 것을 막는다.
  if (FORBIDDEN_KEYS.has(head)) return node;
  const next = { ...node };
  if (rest.length === 0) {
    delete next[head];
    return next;
  }
  const child = next[head];
  if (!isPlainObject(child)) return node;
  const pruned = removePath(child, rest);
  if (Object.keys(pruned).length === 0) delete next[head];
  else next[head] = pruned;
  return next;
}
