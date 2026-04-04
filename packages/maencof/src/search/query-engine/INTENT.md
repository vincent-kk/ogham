# query-engine

## Purpose

지식 그래프 쿼리 엔진. 시드 노드 해석 및 확산 활성화 실행.

## Boundaries

### Always do

- spreading-activation 엔진 재사용
- query-cache로 결과 캐싱
- invalidateQueryCache 외부 제공

### Ask first

- 쿼리 파라미터 구조 변경

### Never do

- 그래프 빌드 로직 포함
