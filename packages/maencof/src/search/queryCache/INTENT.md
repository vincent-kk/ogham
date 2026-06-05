# queryCache

## Purpose

쿼리 결과 인메모리 캐시. graph builtAt 변경 시 자동 invalidate. partialReindex 처럼 builtAt 미변경 in-place mutation 을 수행하는 함수는 자체적으로 invalidateQueryCache() 를 호출해 일관성을 보장한다.

## Boundaries

### Always do

- QueryOptions/QueryResult 타입 사용
- LRU 캐시 구현
- graph 구조를 in-place 변경한 함수는 자체적으로 invalidateQueryCache 를 호출한다 (호출자가 따로 호출할 필요 없음)

### Ask first

- 캐시 크기/TTL 변경

### Never do

- 영속 캐시로 변환
