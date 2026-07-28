import type { ConfigLayerDocuments, ConfigLayerPaths } from "../types/types.js";

import { readLayer } from "./utils/readLayer.js";

/**
 * 두 레이어 파일을 읽어 원문 문서와 경고를 돌려준다. 던지지 않는다.
 *
 * 병합은 하지 않는다 — 설정 페이지가 레이어별 원문을 그대로 필요로 하기
 * 때문이다. 병합 결과까지 한 번에 원하면 `buildConfigScopeState`를 쓴다.
 */
export function readConfigLayers(
  paths: ConfigLayerPaths,
): ConfigLayerDocuments {
  const warnings: string[] = [];
  return {
    user: readLayer(paths.user, warnings),
    project: readLayer(paths.project, warnings),
    warnings,
  };
}
