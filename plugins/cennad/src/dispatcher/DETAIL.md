# dispatcher — Contract

## Requirements

- MCP 도구 핸들러가 준 `DispatchOptions` 를 외부 CLI 실행으로 바꾸고, 결과와 에러를 `ConversationResponse` envelope 로 정규화한다.
- `ErrorCode` 결정은 `errorMap` 한 곳에서만 한다. 어댑터가 독자적으로 코드를 고르지 않는다.
- 모든 CLI 호출은 `@ogham/cross-platform` 을 경유한다 — `child_process` 를 직접 쓰지 않는다.
- provider 별 세션 참조 방식이 다르다: codex 는 thread UUID, claude 는 주입한 `--session-id`, antigravity 는 스트림이 노출한 conversation id(없으면 cwd 격리).

## API Contracts

- `codex/` — `codex exec` 어댑터.
- `claude/` — `claude -p` 어댑터. 부모 Claude 세션 간섭을 막는 격리 플래그를 항상 부착한다.
- `antigravity/` — `agy -p` 어댑터. 세션마다 격리된 cwd 에서 실행한다.
- `errorMap/` — 실패 신호 → `ErrorCode` 단일 매핑.

## Acceptance Criteria

### AC-envelope-normalization — 봉투 정규화

- 성공·실패 모두 `ConversationResponse` 형태로 돌아온다.
- 어댑터가 `ErrorCode` 를 직접 결정하지 않고 `errorMap` 을 거친다.

### AC-cli-via-cross-platform — CLI 호출 경유

- `child_process` 직접 호출이 0건이다.

## Last Updated

2026-07-30 — dispatcher 계층의 정규화 계약을 문서화했다. 가짜 CLI 바이너리 픽스처는 소비자 10곳의 공통 조상인 `src/__tests__/fixtures/` 로 옮겨, 면책 선언 없이 경계를 지키게 했다.
