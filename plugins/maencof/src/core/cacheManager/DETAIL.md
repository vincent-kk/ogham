# cacheManager — Contract

## Requirements

- 캐시 좌표는 해시로 파생한다: `cwdHash` 가 프로젝트를, `sessionIdHash` 가 세션을 가른다. 호출자가 경로를 직접 조립하지 않는다.
- 캐시 부재는 정상이다. read 는 빈 값으로 degrade 하고 throw 하지 않는다 — 캐시는 재생성 가능한 파생물이다.
- prompt-scope 와 turn-scope 는 수명이 다르다. `removeTurnContext` 는 턴 산출물만, `removeSessionFiles` 는 세션 scope 파일 전체를 지운다.
- 만료 정책은 여기 있지 않다. `pruneOldSessions` 는 호출자가 준 기준으로만 지운다.

## API Contracts

- `cwdHash(cwd)` · `sessionIdHash(sessionId)` · `getCacheDir(cwd)` — 좌표 파생. 파일시스템을 건드리지 않는다.
- `readPromptContext` · `writePromptContext` · `hasPromptContext` — prompt-scope 캐시.
- `readTurnContext` · `writeTurnContext` · `removeTurnContext` — turn-scope 캐시.
- `readPinnedNodes` · `writePinnedNodes` — 핀 노드 목록(`PinnedNode[]`).
- `isFirstInSession` · `markSessionInjected` — 세션 1회성 주입 판정과 기록.
- `pruneOldSessions` · `removeSessionFiles` — 세션 정리.

## Acceptance Criteria

### AC-cache-absent-degrades — 캐시 부재 degrade

- 캐시 파일이 없을 때 read 계열이 throw 없이 빈 값을 반환한다.

### AC-session-scope-cleanup — 세션 scope 정리

- `removeSessionFiles` 가 같은 세션 scope 파일을 함께 지운다.

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다. 훅과 MCP 가 같은 캐시 파일을 읽고 쓰므로 좌표 파생을 훅 쪽에서 다시 구현하면 두 경로가 어긋난다.

## Last Updated

2026-07-30 — 캐시 좌표·scope 수명 계약과 훅 직접 import 면책을 문서화했다.
