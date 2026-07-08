# queryEngine

## Purpose

지식 그래프 쿼리 엔진. 시드 노드 해석 및 QGA-SA 확산 실행 (maxHops → 반복 횟수 T 매핑, 쿼리 토큰 게이트 공급).

## Boundaries

### Always do

- spreadingActivation 엔진 재사용
- queryCache로 결과 캐싱
- invalidateQueryCache 외부 제공

### Ask first

- 쿼리 파라미터 구조 변경

### Never do

- 그래프 빌드 로직 포함
