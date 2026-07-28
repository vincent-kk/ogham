# dependencyGraph — 실제 owner dependency DAG

## Purpose

Adapter dependency reference를 owner-level evidence edge로 집계하고 실제 cycle과 certainty를 계산한다.

## Structure

- `builders/` organ — owner 해석, evidence edge 집계와 graph 조립
- `cycles/` organ — cyclic component에서 stable directed closed route 추출
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
- unresolved가 결론에 영향을 주면 certainty를 indeterminate로 반환

### Ask first

- cycle canonicalization 또는 certainty 집계 정책 변경
- owner-level edge보다 낮은 graph public surface 추가

### Never do

- hierarchy children/organs를 import dependency로 사용
- path 대소문자 또는 adapter evidence를 임의 정규화
- 파일 I/O 또는 생태계 specifier 해석

## Dependencies

- `../../../types/fractal.js`의 언어 중립 graph DTO
