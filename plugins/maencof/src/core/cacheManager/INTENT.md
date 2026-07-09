# cacheManager

## Purpose

세션별 턴 컨텍스트 캐시 읽기/쓰기/삭제. 핀 노드 관리. session-scope 파일은 `removeSessionFiles` 가 함께 정리한다.

## Structure

- `index.ts` — 순수 barrel (공개 API: 해시/경로 파생 + prompt/turn/pinned read·write·remove + PinnedNode 타입)
- `types/` organ — 공개 타입 (PinnedNode)
- `operations/` organ — 캐시 연산 (해시/경로 cwdHash·sessionIdHash·getCacheDir, prompt/turn 컨텍스트 read/write, 핀 노드 read/write, session/turn 정리; 함수 1개/파일)

## Boundaries

### Always do

- JSON 파일 기반 캐시 저장
- PinnedNode 타입 준수

### Ask first

- 캐시 파일 경로 변경

### Never do

- 캐시 만료 정책 변경
