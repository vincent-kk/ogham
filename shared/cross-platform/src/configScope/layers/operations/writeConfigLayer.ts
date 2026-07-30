import { ensureDirectorySync } from "../../../filesystem/mutation/ensureDirectorySync.js";
import { writeFileAtomicallySync } from "../../../filesystem/mutation/writeFileAtomicallySync.js";
import { portableDirname } from "../../../paths/compat/operations/portableDirname.js";
import { stripForbiddenKeys } from "../../merge/index.js";
import type { ConfigLayerPaths, ConfigScope } from "../../types/types.js";

/**
 * 한 레이어 파일을 원자적으로 교체하고 쓴 경로를 반환한다.
 *
 * `scope: "project"`인데 프로젝트 루트를 모르면 던진다 — 조용히 user에 쓰면
 * 사용자가 의도한 것과 다른 파일이 바뀐다. 읽기와 달리 쓰기는 실패를 삼키면
 * 안 되는 쪽이다.
 *
 * 병합이 버릴 키는 애초에 쓰지 않는다. 한번 파일에 들어가면 빠져나올 길이
 * 없기 때문이다 — 병합은 매번 버리고, 설정 페이지는 자기가 아는 키만 보내며,
 * 저장된 문서를 펴서 되쓰는 저장 경로는 오히려 그 키를 보존한다.
 *
 * `fileMode`와 `directoryMode`는 소비자가 기존 권한을 유지하기 위해 넘긴다 —
 * 민감 식별자를 담는 atlassian/entrez의 `0o600`, deilen의 `0o700` 디렉터리가
 * 그 경우다. 생략하면 `writeFileAtomicallySync`가 기존 파일 mode를 보존하고
 * 디렉터리는 umask를 따른다.
 */
export function writeConfigLayer(
  paths: ConfigLayerPaths,
  scope: ConfigScope,
  document: Record<string, unknown>,
  options?: { readonly fileMode?: number; readonly directoryMode?: number },
): string {
  const target = scope === "user" ? paths.user : paths.project;
  if (target === null)
    throw new Error(
      "Cannot write the project config layer: no project root was resolved.",
    );

  ensureDirectorySync(portableDirname(target), {
    mode: options?.directoryMode,
  });
  writeFileAtomicallySync(
    target,
    `${JSON.stringify(stripForbiddenKeys(document), null, 2)}\n`,
    {
      fileMode: options?.fileMode,
      directoryMode: options?.directoryMode,
    },
  );
  return target;
}
