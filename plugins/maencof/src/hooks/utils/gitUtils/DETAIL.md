# gitUtils — Contract

## Requirements

- 모든 git 실행은 `runGit` 을 경유한다. `runGit` 은 `@ogham/cross-platform/spawn` 의 `spawnCli` 래퍼이고 `child_process` 를 직접 쓰지 않는다 — Windows 에서 셸 해석이 달라지기 때문이다.
- `index.lock` 충돌은 정상 경합이다. `GIT_LOCK_RETRY_DELAYS_MS` 로 backoff 재시도한다.
- staging pathspec 에는 `SENSITIVE_EXCLUDE_PATH_SPECS` 를 항상 동반한다. scope 밖 경로는 staging 에 넣지 않는다.
- force push 를 실행하지 않는다.

## API Contracts

- `runGit(args, options)` — git 실행. lock 충돌 시 backoff 재시도.
- `isGitRepo(dir)` · `getGitRoot(dir)` · `isIndexLocked(dir)` — repo 판별.
- `hasVaultChanges(...)` · `stageVaultChanges(...)` · `listStagedFiles(...)` · `commitStaged(...)` — scope 기반 staging 과 커밋.
- `stagedTopLevels(...)` · `templateStaticPrefix(...)` · `generateCommitMessage(...)` · `MESSAGE_TEMPLATE_REPLACERS` — 커밋 메시지 생성.

## Acceptance Criteria

### AC-spawn-cli-only — spawnCli 경유

- 이 fractal 의 어떤 파일도 `child_process` 를 직접 import 하지 않는다.

### AC-sensitive-exclude — 민감 경로 제외

- staging pathspec 에 민감 exclude 가 함께 전달된다.

### AC-lock-retry — lock 재시도

- `index.lock` 충돌에서 즉시 실패하지 않고 backoff 재시도한다.

## Boundary Exemptions

### `runner` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 네 organ 전체(runner·repo·staging·message)가 번들에 끌려 들어와 가드를 넘긴다 — 커밋 경로 하나만 쓰는 훅도 메시지 생성기까지 싣게 된다.

### `repo` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다.

### `staging` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다.

### `message` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다.

## Last Updated

2026-07-30 — spawnCli 경유·민감 exclude 계약과 훅 직접 import 면책 4건을 문서화했다.
