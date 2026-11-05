import { readUtf8FileIfExistsSync } from "../../../filesystem/read/readUtf8FileIfExistsSync.js";
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
 * 병합(`mergeConfigLayers`)과 저장(`writeConfigLayer`)이다.
 *
 * @param path 읽을 파일 경로. null이면 디스크를 조회하지 않는다.
 * @param warnings 파일 접근·파싱 실패 및 무시되는 키의 진단을 추가할 배열.
 * @returns 원문 객체 또는 부재·읽기 실패·손상 시 null.
 */
export function readLayer(
  path: string | null,
  warnings: string[],
): Record<string, unknown> | null {
  if (path === null) return null;

  let raw: string | null;
  try {
    raw = readUtf8FileIfExistsSync(path);
  } catch (error) {
    warnings.push(`failed to read config at ${path}: ${String(error)}`);
    return null;
  }
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
