# cacheManager

## Purpose

세션별 턴 컨텍스트 캐시 읽기/쓰기/삭제. 핀 노드 관리.

## Conventions

캐시는 재생성 가능한 파생물이다. 부재를 정상으로 처리하고 prompt와 turn의 수명을 구분해 한 턴 정리가 세션 전체를 지우지 않게 한다.

## Boundaries

### Always do

- PinnedNode 타입 준수

### Ask first

- 캐시 파일 경로 변경

### Never do

- 캐시 만료 정책 변경
