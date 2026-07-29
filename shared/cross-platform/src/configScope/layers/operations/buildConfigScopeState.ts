import { listOverriddenPaths, mergeConfigLayers } from "../../merge/index.js";
import type { ConfigLayerPaths, ConfigScopeState } from "../../types/types.js";

import { readConfigLayers } from "./readConfigLayers.js";

/**
 * 런타임 소비자와 설정 페이지가 공유하는 단일 조회 지점.
 *
 * 런타임은 `state.effective`만 꺼내 자기 스키마로 검증하고, 설정 페이지는
 * 전체를 JSON으로 내보내 스코프 토글과 상속 배지를 그린다. 둘이 같은 함수를
 * 쓰는 것이 "화면에 보이는 값"과 "실제로 먹는 값"이 갈라지지 않는 이유다.
 */
export function buildConfigScopeState(
  paths: ConfigLayerPaths,
): ConfigScopeState {
  const documents = readConfigLayers(paths);
  return {
    paths,
    layers: { user: documents.user, project: documents.project },
    effective: mergeConfigLayers(documents.user, documents.project),
    overridden: listOverriddenPaths(documents.project),
    warnings: documents.warnings,
  };
}
