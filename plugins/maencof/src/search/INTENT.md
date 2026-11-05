# search

## Purpose

지식 그래프 검색 모듈. 쿼리 엔진, 컨텍스트 조합, 캐시.

## Conventions

검색은 core가 제공하는 그래프를 소비한다. 빌드와 검색을 분리하고 캐시 무효화를 함께 유지해야 변경된 그래프에 오래된 결과를 돌려주지 않는다.

## Boundaries

### Always do

- core/ 확산 활성화 엔진 재사용
- QueryCache로 중복 쿼리 방지

### Ask first

- 검색 알고리즘 변경
- 캐시 전략 변경

### Never do

- 그래프 구조 직접 수정
