import { pluginCache, portableJoin } from "../../paths/index.js";
import type {
  ConfigLayerPaths,
  ResolveConfigLayersOptions,
} from "../types/types.js";

/**
 * 두 레이어 파일의 절대 경로를 정한다. 파일 존재 여부는 보지 않는다 —
 * 좌표 계산과 디스크 조회는 분리된 관심사다.
 *
 * `projectRoot`는 호출자가 이미 해석해 넘긴다. 플러그인마다 앵커 규칙이
 * 달라(git root / repo root / 인자 cwd) 여기서 통일하면 기존 동작이 바뀐다.
 * 알 수 없으면 `null`이고, 그러면 project 레이어가 통째로 비활성이 된다.
 */
export function resolveConfigLayers(
  options: ResolveConfigLayersOptions,
): ConfigLayerPaths {
  const fileName = options.fileName ?? "config.json";
  const userDir = options.userDir ?? pluginCache(options.pluginName);
  const projectDirName = options.projectDirName ?? `.${options.pluginName}`;
  return {
    user: portableJoin(userDir, fileName),
    project:
      options.projectRoot === null
        ? null
        : portableJoin(options.projectRoot, projectDirName, fileName),
  };
}
