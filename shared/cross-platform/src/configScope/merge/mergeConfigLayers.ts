import { FORBIDDEN_KEYS } from "./utils/forbiddenKeys.js";
import { isPlainObject } from "./utils/isPlainObject.js";

/**
 * user 레이어 위에 project 레이어를 재귀 병합한다.
 *
 * 규칙: 양쪽이 plain object인 키만 재귀한다. 배열·원시값·`null`은 override가
 * 통째로 교체한다 — 배열을 인덱스 단위로 병합하면 `["basic","auth","extra"]`
 * 위에 `["advanced"]`를 얹었을 때 `["advanced","auth","extra"]`가 되어
 * project 레이어에서 목록을 줄일 방법이 없어진다.
 *
 * 입력을 변형하지 않는다. 호출자가 `layers.user`와 `effective`를 동시에
 * 들고 있으므로 in-place 병합은 UI가 보여줄 "상속값"을 파괴한다. 다만 얕은
 * 복사이므로 override가 건드리지 않은 중첩 객체는 `base`와 참조를 공유한다 —
 * 읽기 전용으로 쓰는 한 안전하고, 반환값을 변형하는 소비자는 없다.
 *
 * `__proto__` / `constructor` / `prototype` 키는 버린다. 입력은 신뢰할 수 없는
 * 디스크의 JSON이다.
 *
 * 구조는 albatrion `common-utils`의 `merge`를 참조했고, 배열 처리·불변성·키
 * 차단 셋이 그와 다르다.
 */
export function mergeConfigLayers(
  base: Record<string, unknown> | null,
  override: Record<string, unknown> | null,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  if (base !== null) copySafeKeys(base, merged);
  if (override === null) return merged;

  for (const key of Object.keys(override)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    const overrideValue = override[key];
    const baseValue = merged[key];
    merged[key] =
      isPlainObject(baseValue) && isPlainObject(overrideValue)
        ? mergeConfigLayers(baseValue, overrideValue)
        : overrideValue;
  }
  return merged;
}

/** `FORBIDDEN_KEYS`를 뺀 own key만 옮긴다. */
function copySafeKeys(
  source: Record<string, unknown>,
  into: Record<string, unknown>,
): void {
  for (const key of Object.keys(source))
    if (!FORBIDDEN_KEYS.has(key)) into[key] = source[key];
}
