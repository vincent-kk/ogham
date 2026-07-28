import { FORBIDDEN_KEYS } from "./utils/forbiddenKeys.js";
import { isPlainObject } from "./utils/isPlainObject.js";

/**
 * project 레이어에서 값을 가진 리프의 dot path를 열거한다.
 *
 * 리프는 plain object가 아닌 값, 또는 빈 plain object다. 배열은 교체 단위라
 * 리프로 센다. 설정 페이지가 이 목록으로 "재정의됨" 배지를 그린다.
 *
 * `FORBIDDEN_KEYS`는 열거하지 않는다. `mergeConfigLayers`가 버리는 키라
 * 재정의로 셀 수 없고, 열거하면 UI가 배지를 띄운 뒤 그 path를
 * `clearConfigPaths`로 넘겨 대입 경로로 오염이 되돌아온다.
 */
export function listOverriddenPaths(
  override: Record<string, unknown> | null,
): readonly string[] {
  if (override === null) return [];
  const paths: string[] = [];
  const walk = (node: Record<string, unknown>, prefix: string): void => {
    for (const [key, value] of Object.entries(node)) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      const path = prefix === "" ? key : `${prefix}.${key}`;
      if (isPlainObject(value) && Object.keys(value).length > 0)
        walk(value, path);
      else paths.push(path);
    }
  };
  walk(override, "");
  return paths;
}
