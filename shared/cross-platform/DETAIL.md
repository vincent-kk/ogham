# cross-platform Public Contract

## Requirements

- 모든 파일·경로·CLI 시스템 호출은 상위 공유 패키지가 재사용할 수 있는
  이름 있는 서브패스 API로 제공한다.
- 사용자 상태 루트는 호출자가 선택한 임의 경로가 아니라 명시적 host와
  `CLAUDE_CONFIG_DIR`/`CODEX_HOME` 환경 계약으로만 해석한다.
- 프로젝트 출력 경로는 절대 루트, lexical containment, 기존 descendant
  symlink 검사를 통과해야 한다.
- 파일 교체는 sibling 임시 파일을 사용하고, 동시 변경 적용은 owner-token
  lock과 호출자 리비전 검사로 보호할 수 있어야 한다.
- ENOENT만 정상적인 부재로 취급하고 그 밖의 파일 시스템 오류는 보존한다.

## API Contracts

### `@ogham/cross-platform/host-registry`

```ts
resolveRuntimeHost(
  env: Readonly<Record<string, string | undefined>>,
): Host;
```

미인식 marker 또는 서로 충돌하는 훅 신호는 `unknown`이며 Claude로 추측하지
않는다.

### `@ogham/cross-platform/paths`

```ts
hostStateRoot(
  host: KnownHost,
  env?: Readonly<Record<string, string | undefined>>,
): string;
resolveContainedPath(root: string, ...segments: string[]): string;
```

`resolveContainedPath`는 절대 root만 받고 절대 segment, `..` component,
다른 drive 및 root 밖 결과를 거부한다.

번들 크기 제한 소비자는 전체 배럴 대신 `paths/contained`,
`paths/state-root`, `paths/normalize`, `paths/relative`와
`host-paths/absolute-root` 단일 목적 entry point를 사용한다.

### `@ogham/cross-platform/host-paths`

```ts
requireAbsoluteRoot(value: string): string;
```

POSIX와 Windows 절대 경로 문자열을 현재 실행 OS와 무관하게 정규화한다.

### `@ogham/cross-platform/config-scope`

```ts
type ConfigScope = "user" | "project";

resolveConfigLayers(options: {
  pluginName: string;
  projectRoot: string | null;
  fileName?: string;
  projectDirName?: string;
  userDir?: string;
}): ConfigLayerPaths;
readConfigLayers(paths: ConfigLayerPaths): ConfigLayerDocuments;
writeConfigLayer(
  paths: ConfigLayerPaths,
  scope: ConfigScope,
  document: Record<string, unknown>,
  options?: { fileMode?: number },
): string;
buildConfigScopeState(paths: ConfigLayerPaths): ConfigScopeState;

mergeConfigLayers(
  base: Record<string, unknown> | null,
  override: Record<string, unknown> | null,
): Record<string, unknown>;
listOverriddenPaths(
  override: Record<string, unknown> | null,
): readonly string[];
clearConfigPaths(
  source: Record<string, unknown>,
  paths: readonly string[],
): Record<string, unknown>;
```

user 레이어는 `pluginCache(pluginName)/config.json`, project 레이어는
`<projectRoot>/.<pluginName>/config.json`이며 project가 user를 재정의한다.

레이어 읽기는 throw하지 않는다. 부재와 손상은 모두 `null`이고 손상만
`warnings`를 남긴다. project 레이어 쓰기 요청인데 경로가 `null`이면 던진다 —
조용히 user에 쓰지 않는다.

병합은 재귀이며 배열·원시값·`null`은 override가 **통째로** 교체한다. 배열을
인덱스 단위로 병합하지 않으므로 project 레이어가 목록을 줄일 수 있다. 병합은
입력 둘 다 변형하지 않고 새 객체를 반환한다. 다만 얕은 복사라 override가
건드리지 않은 중첩 객체는 base와 참조를 공유한다.

병합은 `__proto__` / `constructor` / `prototype` 키를 버린다. 입력이 디스크의
JSON이고 `JSON.parse`가 `__proto__`를 own key로 만들기 때문에 실제 벡터다.
레이어 원문은 정화하지 않고 그대로 노출하며, 해당 키를 발견하면 `warnings`에만
남긴다 — 걸러내는 지점을 병합 한 곳으로 모아야 "파일에는 있는데 왜 안 먹지"의
원인이 흩어지지 않는다.

레이어 각각은 스키마 검증하지 않는다. 병합 결과 하나만 소비자의 스키마로
검증한다. project 레이어는 재정의된 키만 담은 부분 문서라 단독으로는 strict
스키마를 통과할 수 없다.

`projectRoot` 해석은 호출자 책임이다. 앵커 규칙이 플러그인마다 다르므로
(git root / repo root / 인자 cwd) 해석된 절대 경로를 넘긴다.

`config-scope/merge`는 node 내장을 import하지 않는다. 브라우저 설정 페이지
번들과 훅 번들의 공용 경계이며, `merge/__tests__/pureImports.test.ts`가 이를
강제한다. 파일 I/O가 필요 없는 소비자는 루트 배럴 대신 이 subpath를 쓴다.

### 설정 페이지 계약

두 네임스페이스를 구분해 편집하는 화면은 각 플러그인이 자기 페이지에서
구현한다. 공유 UI 패키지를 두지 않으므로 **이 절이 8곳의 정본**이고,
`plugins/deilen/src/mcp/pages/settings/`가 참조 구현이다.

```
GET  /api/config
  → { ok: true, state: ConfigScopeState }

POST /api/config
  body { scope: "user" | "project", config: Record<string, unknown> }
  → { ok: true, state: ConfigScopeState } | { ok: false, message, errors? }
```

`scope: "user"`는 전체 필드를 담은 완결 문서를 보낸다. `scope: "project"`는
재정의된 키만 담으며, 키를 빼는 것이 곧 재정의 해제다 — 별도 clear 라우트를
두지 않는다. 응답은 항상 갱신된 상태를 돌려줘 클라이언트가 재조회 없이 배지를
다시 그린다.

저장 검증은 제출 레이어를 저장된 반대편 레이어 위에 병합한 미리보기 결과를
소비자 스키마로 확인하고, 통과할 때만 파일을 쓴다.

| 요소           | 규약                                                                |
| -------------- | ------------------------------------------------------------------- |
| 스코프 토글    | `<input name="config_scope" value="user" \| "project">`             |
| 필드 식별      | 필드 래퍼에 `data-config-path="renderers.mermaid"` (dot path)       |
| 상속 상태      | 같은 요소에 `data-scope-state="inherited" \| "overridden" \| "own"` |
| 배지·해제 버튼 | 표시 여부는 CSS가 `[data-scope-state=...]`로 결정                   |

해제 버튼은 project 레이어가 **부분 문서**인 곳에만 둔다. 키를 빼는 것이 곧
해제이기 때문이다. project 레이어가 커밋된 단일 결정인 곳(seiri)은 배지만
두고 해제는 git 작업으로 남긴다 — 팀이 소유한 파일을 설정 클릭으로 지우게
하는 것이 잘못된 affordance다.

`paths.project`가 `null`이면 Project 라디오는 `disabled`이고 이유를 한 줄
표시한다.

### `@ogham/cross-platform/filesystem`

```ts
readUtf8FileIfExistsSync(path: string): string | null;
readFileIfExistsSync(path: string): Uint8Array | null;
listDirectoryIfExistsSync(path: string): readonly string[];
ensureDirectorySync(path: string, options?: { mode?: number }): void;
removeFileIfExistsSync(path: string): boolean;
writeFileAtomicallySync(
  path: string,
  content: string | Uint8Array,
  options?: { fileMode?: number; directoryMode?: number },
): void;
assertNoSymlinkDescendantsSync(root: string, targetPath: string): void;
withFileLockSync<T>(
  targetPath: string,
  operation: () => T,
  options?: { timeoutMs?: number; staleMs?: number },
): { acquired: true; value: T } | { acquired: false };
```

원자 쓰기는 지정 mode가 없으면 기존 파일 mode를 보존한다. 잠금 timeout은
operation을 호출하지 않고 `acquired: false`를 반환한다. stale lock은 고유
quarantine 이름으로 atomic rename한 프로세스만 정리하며 owner token이
일치하는 소유자만 live lock을 해제한다.

`assertNoSymlinkDescendantsSync`는 신뢰 경계인 `root` 자체가 아니라
`root`부터 `targetPath`까지 이미 존재하는 descendant segment를 검사한다.

한 종류의 읽기만 필요한 제한 훅은 `filesystem/read/utf8`,
`filesystem/read/bytes`, `filesystem/read/directory` 직접 진입점을 사용한다.
`filesystem/read` aggregate 진입점은 제공하지 않으며, 이 경로들은 다른
read helper의 tree-shaking에 기대지 않는다.

`@ogham/cross-platform/filesystem/hook-io`는 기존 hook 동작을 보존하기 위한
일반 UTF-8 write와 sibling copy만 제공한다. 이 경량 API는 hook bundle 전용
호환 경계이며, 범용 artifact apply는 계속 atomic write와 lock을 사용한다.

`@ogham/cross-platform/host-registry/runtime`,
`@ogham/cross-platform/instructions/read`, `instructions/write`는 각각 runtime
host 판별, section 판독, section 변경에 필요한 함수만 노출한다.

훅의 단일 사실 조회는 `host-registry/descriptor`, `paths/plugin-cache`,
`error-log/path`, `error-log/write`를 사용한다. 기존 aggregate 진입점은
호환용으로 유지하지만 새 제한 훅의 import 경계로 사용하지 않는다.
portable 경로 함수도 `compat/basename`, `compat/join`,
`compat/is-absolute`, `compat/path-for-compare`, `compat/resolve` 직접
진입점을 제공한다.
`logHookFailure`의 파일 I/O는 best-effort이며 기록 실패를 호출 훅에 던지지
않는다.

`@ogham/cross-platform/self-probe/hook`은 SessionStart의 node/git/PATH/plugin
root 진단 의미를 유지하면서 Node builtin만 사용한다. 범용 `spawnCli`,
`cross-spawn`, executable discovery를 import graph에 포함하지 않는다.

## Last Updated

2026-07-29 — user/project 두 네임스페이스를 병합해 읽는 `config-scope` 추가.

2026-07-26 — agent artifact 프리미티브와 hook용 목적별 entry point 추가.
