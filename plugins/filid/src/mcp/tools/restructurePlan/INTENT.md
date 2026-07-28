# restructurePlan — persisted read-only placement

## Purpose

snapshot evidence로 `sourcePath → targetPath`, required artifact와 import rewrite
계획을 만들고 크기와 무관하게 ephemeral artifact로 반환한다.

## Structure

- `restructurePlan.ts` — snapshot, core planner와 always-persist payload
- `index.ts` — named handler export

## Conventions

- move, already-placed와 unresolved count는 summary에 항상 남긴다.
- full plan은 inline이 아니라 artifact가 실행자와 validator의 교환 형식이다.

## Boundaries

### Always do

- plan ID, snapshot hash, LCA, basis와 decision reason 보존
- 불확실한 contract/name/entry/specifier evidence를 unresolved 처리
- `persistence: always`로 full payload 저장

### Ask first

- plan DTO, decision reason 또는 persistence 의미 변경

### Never do

- source file 이동·생성·삭제·수정
- import rewrite 실행
- unresolved move를 실행 가능하다고 표현

## Dependencies

- core projectSnapshot/restructure, adapters와 common envelope
