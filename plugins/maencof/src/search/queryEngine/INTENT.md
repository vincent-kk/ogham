# queryEngine

## Purpose

지식 그래프 쿼리 엔진. 시드 노드 해석(쿼리 내 상대 IDF 로 흔한 토큰 시드 강등 — 동형이의어 노이즈 억제, 후보 union 불변), kg_context 자연어 분해(`deriveContextSeeds` — 단어 OR + 인접 2-gram phrase), QGA-SA 확산 실행 (maxHops → 반복 횟수 T 매핑, 쿼리 토큰 게이트 공급), 공유 since/until updated 윈도우 필터(node.updated YYYY-MM-DD 문자열 비교·양끝 inclusive, 결과 절단 전 query() 내부 1회 적용 — kg_search/kg_context/kg_timeline 공용).

## Structure

- `index.ts` — 순수 barrel (공개 API: query/QueryEngine/invalidateQueryCache/resolveSeedNodes/deriveContextSeeds + 타입)
- `types/` organ — 공개 타입 (MatchType/ScoredSeed/QgaTuning/QueryOptions/QueryResult)
- `tokenize/` organ — 문자열 분해 (tokenizeSeed/normalizePhrase/deriveContextSeeds)
- `seeds/` organ — 시드 해석 (resolveSeedNodes 오케스트레이터 + 분류/IDF/budget, 함수 1개/파일)
- `query/` organ — 검색 실행 (query/QueryEngine 클래스/캐시 싱글턴/게이트 토큰, 함수 1개/파일)
- `queryCache/` sub-fractal — LRU 쿼리 결과 캐시

## Boundaries

### Always do

- spreadingActivation 엔진 재사용
- queryCache로 결과 캐싱
- invalidateQueryCache 외부 제공

### Ask first

- 쿼리 파라미터 구조 변경

### Never do

- 그래프 빌드 로직 포함
