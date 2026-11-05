# queryEngine

## Purpose

시드 해석과 QGA-SA 검색을 조합하고 공통 필터·클러스터 대표 선정·절단을 소유한다. 소비자가 별도 필터나 collapse를 구현하면 검색 도구와 평가 하네스의 의미가 갈라진다.

## Conventions

같은 클러스터의 문서는 독립 증거가 아니라 반복 관측이다. 합산 점수 대신 활성 멤버 max를 승계해 문서 수 프리미엄을 막는다.

## Boundaries

### Always do

- spreadingActivation 엔진 재사용
- queryCache로 결과 캐싱
- invalidateQueryCache 외부 제공

### Ask first

- 쿼리 파라미터 구조 변경

### Never do

- 그래프 빌드 로직 포함
- 소비자 측에서 클러스터 collapse 를 재구현 — collapse 는 query() 안 한 지점(절단 전)에서만 일어나고 kg_search·kg_context·평가 하네스가 모두 그 지점을 지난다
- `subLayerFilter` 를 절단(slice) 뒤에 적용 — post-slice 필터는 `maxResults` 미달을 만든다
