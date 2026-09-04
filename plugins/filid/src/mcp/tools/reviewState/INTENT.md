# reviewState — cross-review bookkeeping

## Purpose

committed diff content hash, branch-scoped review artifact lifecycle, 변경 범위 FCA 증거 수집과 merge-track 재개 지점의 관측만 관리한다. review 판단, committee 선택, 코드 수정과 PR 동작은 소유하지 않는다.

## Structure

- `reviewState.ts` — prepare/checkpoint/scope/seal/cleanup/assess action dispatch
- `handlers/` — 여섯 action의 flat effect boundary
- `hash/` — git evidence와 deterministic content hash organ
- `state/` — portable review path와 state JSON organ
- `assess/` — dirty 경로 분류, entry stage와 base ref 해석의 순수 함수 organ
- `scope/` — changed-file roster와 변경 범위 증거 정규화의 순수 함수 organ
- `index.ts` — named handler export

## Conventions

- state path는 `.filid/review/<readable-name>-<branch-digest>/review-state.json`이다.
- hash는 merge-base와 NUL-safe sorted changed-file tree identity로 계산한다.
- static action/status/file names는 constants가 소유한다.

## Boundaries

### Always do

- prepare/seal에서 현재 committed content hash 재계산
- cache hit에 sealed state, matching hash와 report 존재를 모두 요구
- state I/O와 cleanup에 project-contained path와 descendant symlink guard 요구
- cleanup에 literal `confirm: true` 요구

### Ask first

- state schema, required report 또는 cache-hit 의미 변경

### Never do

- review 의견·verdict 계산, fix 적용, commit/push/PR 수행 — `assess`는 사실만 관측하고 무엇을 중단할지 정하지 않는다
- working-tree content를 committed blob으로 가장
- review root 전체를 branch target으로 정규화

## Dependencies

- cross-platform path/spawn/filesystem, common envelope와 review constants
