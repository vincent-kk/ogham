# dependencyGraph — 실제 owner dependency DAG

## Purpose

Adapter dependency reference를 owner-level evidence edge로 집계하고 실제 cycle을 계산한다. 참조를 확정하지 못한 파일은 `unknownFiles`에 귀속하고, 그 파일이 주어진 대상과 관련되는지 가린다.

## Structure

- `buildDag.ts`와 query helper — 작업 8 전 legacy characterization 경계
- `detectCycles.ts` — legacy/target graph를 cycle algorithm에 연결
- `index.ts` — named-export public entry point
- legacy query helper는 작업 8 제거 전까지만 유지한다.

## Conventions

- tradeoff 우선순위: 1. 증거 정확성 2. 결정론 3. query 편의
- same-owner evidence는 boundary 검사에 남기되 cycle adjacency에서 제외한다.

## Boundaries

### Always do

- source, raw specifier와 resolved path를 edge evidence에 보존
- logical path alias를 canonical owner 하나로 모으고 edge를 안정적으로 정렬
- 각 cyclic component를 실제 directed edge로 닫히는 대표 route로 반환
- owner identity는 portable path 비교로 판정하되 선택한 원문 path는 보존
- 확정하지 못한 참조는 원인 파일의 `unknownFiles` 항목으로 남기고, certainty는 그 목록에서 파생

### Ask first

- cycle canonicalization 또는 certainty 집계 정책 변경
- owner-level edge보다 낮은 graph public surface 추가

### Never do

- hierarchy children/organs를 import dependency로 사용
- path 대소문자 또는 adapter evidence를 임의 정규화
- 파일 I/O 또는 생태계 specifier 해석

## Dependencies

- `../../../types/fractal.js`의 언어 중립 graph DTO
