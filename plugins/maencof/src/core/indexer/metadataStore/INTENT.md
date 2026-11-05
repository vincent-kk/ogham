# metadataStore

## Purpose

사전 계산된 그래프/가중치 메타데이터 JSON 영속화 및 역직렬화.

## Conventions

런타임 조회 맵은 디스크 정본이 아니다. 빌드와 리로드가 같은 재수화 경로를 사용해야 검색 의미가 갈라지지 않는다.

## Boundaries

### Always do

- CACHE_FILES 상수로 파일명 관리
- Map ↔ JSON 직렬화 처리

### Ask first

- 캐시 파일 구조 변경

### Never do

- 캐시 외 데이터 저장
