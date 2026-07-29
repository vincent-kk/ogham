import { readUtf8FileIfExistsSync } from "../../../filesystem/index.js";
import { isPlainObject } from "../../merge/index.js";

import { findForbiddenKeys } from "./findForbiddenKeys.js";

/**
 * 한 레이어 파일을 읽어 원문 문서를 돌려준다. 절대 던지지 않는다.
 *
 * 부재는 정상 상태이며 `null`이다 — setup을 아직 돌리지 않은 프로젝트가 그
 * 상태다. 손상도 `null`이지만 `warnings`를 남겨 둘을 구별할 수 있게 한다.
 * 세션을 죽이지 않는 것이 이 계층의 계약이다.
 *
 * 문서를 정화하지는 않는다. `FORBIDDEN_KEYS`는 경고만 남기고 원문에 그대로
 * 둔다 — UI가 파일 내용을 있는 그대로 보여줘야 하고, 걸러내는 지점은
 * `mergeConfigLayers` 한 곳이다.
 */
export function readLayer(
  path: string | null,
  warnings: string[],
): Record<string, unknown> | null {
  if (path === null) return null;

  const raw = readUtf8FileIfExistsSync(path);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    warnings.push(`failed to parse JSON at ${path}: ${String(error)}`);
    return null;
  }

  if (!isPlainObject(parsed)) {
    warnings.push(`ignored ${path}: config must be a JSON object`);
    return null;
  }

  for (const key of findForbiddenKeys(parsed))
    warnings.push(`ignored unsafe key "${key}" in ${path}`);

  return parsed;
}
