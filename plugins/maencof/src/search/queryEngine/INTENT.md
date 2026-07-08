# queryEngine

## Purpose

지식 그래프 쿼리 엔진. 시드 노드 해석, 확산 엔진 선택(`engine`: legacy v1 하드카피 / qga v2), 확산 실행.

## Boundaries

### Always do

- spreadingActivation 엔진 재사용 (v1/v2 분기는 query() 한 곳에서만)
- queryCache로 결과 캐싱 (캐시 키에 engine 포함)
- invalidateQueryCache 외부 제공

### Ask first

- 쿼리 파라미터 구조 변경

### Never do

- 그래프 빌드 로직 포함
