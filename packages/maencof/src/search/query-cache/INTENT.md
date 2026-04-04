# query-cache

## Purpose

쿼리 결과 인메모리 캐시. TTL 기반 만료.

## Boundaries

### Always do

- QueryOptions/QueryResult 타입 사용
- LRU 캐시 구현

### Ask first

- 캐시 크기/TTL 변경

### Never do

- 영속 캐시로 변환
