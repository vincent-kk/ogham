# gitUtils — Contract

## Requirements

- 모든 git 실행은 `runGit` 을 경유한다. `runGit` 은 `@ogham/cross-platform` 의 `spawnCli` 래퍼이고 `child_process` 를 직접 쓰지 않는다 — Windows 에서 셸 해석이 달라지기 때문이다.
- `index.lock` 충돌은 정상 경합이다. `GIT_LOCK_RETRY_DELAYS_MS` 로 backoff 재시도한다.
- staging pathspec 에는 `SENSITIVE_EXCLUDE_PATH_SPECS` 를 항상 동반한다. scope 밖 경로는 staging 에 넣지 않는다.
- force push 를 실행하지 않는다.

## API Contracts

staging 범위와 민감 경로 제외를 함께 전달한다. index.lock은 정상적인 동시 작업 경합으로 취급하고 이식 가능한 실행 래퍼의 backoff 정책을 유지한다.

## Acceptance Criteria

### AC-spawn-cli-only — spawnCli 경유

- 이 fractal 의 어떤 파일도 `child_process` 를 직접 import 하지 않는다.

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

git 실행 래퍼, index.lock 재시도 또는 staging 범위·민감 경로 제외 계약이 바뀔 때 갱신한다.
