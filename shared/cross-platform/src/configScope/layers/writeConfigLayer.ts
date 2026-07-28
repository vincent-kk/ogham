import {
  ensureDirectorySync,
  writeFileAtomicallySync,
} from "../../filesystem/index.js";
import { portableDirname } from "../../paths/index.js";
import type { ConfigLayerPaths, ConfigScope } from "../types/types.js";

/**
 * 한 레이어 파일을 원자적으로 교체하고 쓴 경로를 반환한다.
 *
 * `scope: "project"`인데 프로젝트 루트를 모르면 던진다 — 조용히 user에 쓰면
 * 사용자가 의도한 것과 다른 파일이 바뀐다. 읽기와 달리 쓰기는 실패를 삼키면
 * 안 되는 쪽이다.
 *
 * `fileMode`는 민감 식별자를 담는 소비자(atlassian, entrez)가 `0o600`을
 * 유지하기 위해 넘긴다. 생략하면 `writeFileAtomicallySync`가 기존 파일의
 * mode를 보존한다.
 */
export function writeConfigLayer(
  paths: ConfigLayerPaths,
  scope: ConfigScope,
  document: Record<string, unknown>,
  options?: { readonly fileMode?: number },
): string {
  const target = scope === "user" ? paths.user : paths.project;
  if (target === null)
    throw new Error(
      "Cannot write the project config layer: no project root was resolved.",
    );

  ensureDirectorySync(portableDirname(target));
  writeFileAtomicallySync(target, `${JSON.stringify(document, null, 2)}\n`, {
    fileMode: options?.fileMode,
  });
  return target;
}
