# foldDaily — Contract

## Requirements

- 접는 대상은 **당일**의 **연속된 자동 커밋**뿐이다. 수동 커밋은 폴딩 경계이며 절대 접지 않는다 — 사용자의 커밋을 자동화가 재작성하면 히스토리를 신뢰할 수 없다.
- 히스토리 조작은 `git reset --soft` 만 쓴다. `reset --hard` 나 rebase 처럼 워킹트리·index 를 건드리는 조작은 하지 않는다.
- 재커밋이 실패하면 `git reset --soft ORIG_HEAD` 로 원래 HEAD 를 복구한다. 실패가 커밋을 잃게 하지 않는다.
- HEAD 부재·root 도달·`FOLD_SCAN_MAX_COMMITS` 초과는 포기 조건이다. `null`·`false` 를 반환하고 호출자가 일반 커밋으로 진행한다.
- git 실행은 `gitUtils` 의 `runGit` 을 concrete 경로로 가져와 쓴다.

## API Contracts

- `isAutoCommitSubject(subject)` — subject 가 자동 커밋 마커에 걸리는지. 마커는 `AUTO_COMMIT_SUBJECT_MARKERS` includes 매칭과 `message_template` 정적 접두부 startsWith 매칭.
- `findFoldBase(...)` — HEAD 부터 걸어 접을 BASE 를 찾는다. 조건 미달이면 `null`.
- `tryFoldCommit(...)` — BASE 로 soft reset 후 재커밋. 실패 시 복구하고 `false`.
- `revParse` 는 배럴에 없다. 내부 공용 헬퍼다.

## Acceptance Criteria

### AC-manual-commit-boundary — 수동 커밋 경계

- 수동 커밋을 만나면 그 지점에서 탐색이 멈추고 그 커밋은 접히지 않는다.

### AC-soft-reset-only — soft reset 전용

- 이 fractal 이 실행하는 git 명령에 `reset --hard` 나 rebase 가 없다.

### AC-recover-on-failure — 실패 복구

- 재커밋 실패 시 HEAD 가 원래 커밋으로 돌아온다.

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 폴딩 로직 전체가 번들에 끌려 들어와 가드를 넘긴다 — 호출자(vaultCommitter)도 같은 이유로 concrete 경로를 쓴다.

## Last Updated

2026-07-30 — 폴딩 경계·복구 계약과 훅 직접 import 면책을 문서화했다.
