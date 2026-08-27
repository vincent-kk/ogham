# jira — Contract

## Requirements

- 이 계층은 `core/`·`utils/`·`types/`·`constants/`·`lib/` 만 import 한다. `mcp/` 참조가 0건이다.
- 자식 레시피는 `src/jira/index.ts` 가 이름으로 재노출한다 — 와일드카드 재노출 없음.

## API Contracts

- `commentThread/` — `readCommentThread`, `scanCommentThreads`, `probeCommentThread`, `saveCommentThreadProfile`, `defaultCommentThreadDeps`, 타입 `CommentThreadDeps`.

## Acceptance Criteria

### AC-jira-layer-direction — 단방향 의존

- `src/jira/**` 에서 `mcp/` 를 참조하는 import 가 0건이다.

### AC-jira-named-exports — 이름 있는 재노출

- `src/jira/index.ts` 에 `export *` 가 없다.

## Last Updated

2026-08-28 — 도메인 레시피 계층을 신설했다.
