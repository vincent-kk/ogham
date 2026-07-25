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

2026-07-26 — agent artifact 프리미티브와 hook용 목적별 entry point 추가.
