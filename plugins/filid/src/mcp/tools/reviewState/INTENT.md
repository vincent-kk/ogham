# reviewState — cross-review bookkeeping

## Purpose

committed diff hash와 branch-scoped artifact lifecycle을 기준으로 변경 범위 증거를 수집하고, reviewable unit을 선별·청킹·그룹화하며, branch·base·change context 해석, 규칙 해석, diff·brief 물질화, opinion 검증, 결정적 verdict fold와 보고서 렌더링, merge-track 재개 관측을 관리한다.

## Structure

- `reviewState.ts`·`handlers/` — prepare/checkpoint/validate/seal/cleanup/assess dispatch와 effect boundary
- `hash/`·`state/` — Git evidence, deterministic hash, portable path와 state JSON
- `assess/`·`scope/` — 재개 사실 관측과 changed-scope evidence 수집
- `select/`·`rules/` — review 대상 선별과 built-in·repository 규칙 해석
- `chunk/`·`group/` — bounded review unit과 deterministic dependency group 생성
- `diff/`·`brief/` — group별 diff와 reviewer·verifier brief 물질화
- `opinion/` — review·verify JSON 검증, finding 위치 확정과 round 병합
- `handoff/` organ — artifact 신뢰 관측과 prepare 복구를 순수 handoff 계획에서 분리
- `render/`·`verdict/` — canonical 산출물 렌더링과 순수 verdict fold
- `index.ts` — named handler export

## Conventions

- state path는 `.filid/review/<readable-name>-<branch-digest>/review-state.json`이다.
- hash는 merge-base와 NUL-safe sorted changed-file tree identity로 계산한다.
- static action·status·artifact 이름과 기본 한도는 constants가 소유한다.
- state는 prepare 산출물이 모두 기록된 뒤 마지막에 한 번 atomic 저장한다.

## Boundaries

### Always do

- prepare와 seal에서 현재 committed content hash를 재계산한다.
- 모든 unit과 group에 설정된 file·churn 상한을 적용하고 roster 항목을 빠뜨리지 않는다.
- validate가 기록한 complete·artifact hash·review hash 결합을 seal의 신뢰 근거로 삼는다.
- state I/O, artifact path, repository rule path와 cleanup에 project containment와 symlink guard를 요구한다.
- cleanup에 literal `confirm: true`를 요구한다.

### Ask first

- state schema, opinion JSON schema, 규칙 맵 형식 또는 렌더링 형식 변경
- required artifact 또는 cache-hit 의미 변경

### Never do

- review finding을 생성하거나 그 진위를 판단하지 않는다. 도구가 측정한 candidate와 diff 밖 finding의 decision은 evidence의 결정론적 fold이며 판단이 아니다. 배정 finding의 판단은 opinion·verification 파일을 쓴 actor의 것이다.
- fix 적용, commit/push/PR을 수행하거나 `assess` 관측을 중단 지시로 바꾸지 않는다.
- working-tree content를 committed blob으로 가장하거나 review root 전체를 branch target으로 정규화하지 않는다.

## Dependencies

- cross-platform path·spawn·filesystem, config loader, common envelope와 review constants
