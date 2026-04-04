# metadata-store

## Purpose

사전 계산된 그래프/가중치 메타데이터 JSON 영속화 및 역직렬화.

## Boundaries

### Always do

- CACHE_FILES 상수로 파일명 관리
- Map ↔ JSON 직렬화 처리

### Ask first

- 캐시 파일 구조 변경

### Never do

- 캐시 외 데이터 저장
