# foldDaily — Contract

## Requirements

- 접는 대상은 **당일**의 **연속된 자동 커밋**뿐이다. 수동 커밋은 폴딩 경계이며 절대 접지 않는다 — 사용자의 커밋을 자동화가 재작성하면 히스토리를 신뢰할 수 없다.
- 히스토리 조작은 `git reset --soft` 만 쓴다. `reset --hard` 나 rebase 처럼 워킹트리·index 를 건드리는 조작은 하지 않는다.
- 재커밋이 실패하면 `git reset --soft ORIG_HEAD` 로 원래 HEAD 를 복구한다. 실패가 커밋을 잃게 하지 않는다.
- HEAD 부재·root 도달·`FOLD_SCAN_MAX_COMMITS` 초과는 포기 조건이다. `null`·`false` 를 반환하고 호출자가 일반 커밋으로 진행한다.
- git 실행은 `gitUtils` 의 `runGit` 을 concrete 경로로 가져와 쓴다.

## API Contracts

자동 커밋 마커와 사용자 템플릿의 정적 접두부가 폴딩 대상을 결정한다. 수동 커밋은 경계이며 root·탐색 상한·HEAD 부재에는 일반 커밋으로 폴백한다. 재커밋 실패가 기존 HEAD를 잃게 해서는 안 된다.

## Acceptance Criteria

### AC-soft-reset-only — soft reset 전용

- 이 fractal 이 실행하는 git 명령에 `reset --hard` 나 rebase 가 없다.

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 폴딩 로직 전체가 번들에 끌려 들어와 가드를 넘긴다 — 호출자(vaultCommitter)도 같은 이유로 concrete 경로를 쓴다.

## Last Updated

자동 커밋 폴딩 경계, soft reset 제한 또는 재커밋 실패의 HEAD 복구 계약이 바뀔 때 갱신한다.
