# cacheManager

## Purpose

세션별 턴 컨텍스트 캐시 읽기/쓰기/삭제. 핀 노드 관리. 세션 recap 1회 마커(`recap-emitted-*`) 관리 — session-scope 파일은 `removeSessionFiles` 가 함께 정리한다.

## Boundaries

### Always do

- JSON 파일 기반 캐시 저장
- PinnedNode 타입 준수

### Ask first

- 캐시 파일 경로 변경

### Never do

- 캐시 만료 정책 변경
