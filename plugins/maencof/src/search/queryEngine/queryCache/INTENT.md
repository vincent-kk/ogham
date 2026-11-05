# queryCache

## Purpose

쿼리 결과 인메모리 캐시.

## Conventions

키에 결과 영향 옵션을 빠뜨리면 다른 질의가 같은 결과를 공유한다. 옵션 추가 시 키 열거도 함께 갱신하며 영속 캐시는 도입하지 않는다.

## Boundaries

### Always do

- graph 구조를 in-place 변경한 함수는 자체적으로 invalidateQueryCache 를 호출한다 (호출자가 따로 호출할 필요 없음)

### Ask first

- 캐시 크기(`maxEntries`) 변경 또는 시간 기반 만료(TTL) 도입

### Never do

- 영속 캐시로 변환
