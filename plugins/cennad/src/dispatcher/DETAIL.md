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
- `activeRuns/` — 실행 중 CLI 원장(organ). 내부 소비자는 `withActiveRun` 으로 spawn 을 감싸고, 외부 소비자(`mcp/tools/stopConversation`, `mcp/server/lifecycle/startServer`)는 `index.ts` 가 재노출한 `stopRuns` 만 잡는다.

### activeRuns organ 유지 사유

원장의 유일한 쓰기 주체가 이 fractal 이라 자식 fractal 로 승격하지 않는다. `withActiveRun` 은 provider 어댑터 세 곳이 spawn 직전에 부르는 내부 계약이고, 바깥이 필요로 하는 것은 `stopRuns` 하나뿐이다. 원장을 dispatcher 밖으로 옮기면 "무엇이 실행 중인가"를 spawn 하지 않는 모듈이 소유하게 되고, 어댑터가 자기 상태를 남의 fractal 에 기록하러 나가야 한다. 외부 소비는 엔트리포인트 경유로 제한하고 organ 파일 직접 import 는 허용하지 않는다.

## Acceptance Criteria

### AC-envelope-normalization — 봉투 정규화

- 성공·실패 모두 `ConversationResponse` 형태로 돌아온다.
- 어댑터가 `ErrorCode` 를 직접 결정하지 않고 `errorMap` 을 거친다.

### AC-cli-via-cross-platform — CLI 호출 경유

- `child_process` 직접 호출이 0건이다.

### AC-run-cancellable — 실행 중 CLI 취소 가능

- 세 provider 모두 spawn 을 `withActiveRun` 으로 감싸 원장에 등록한다.
- 호출자 signal abort 또는 `stopRuns` 는 CLI 를 프로세스 그룹째 SIGKILL 한다 (`detached: true`).
- 취소로 끝난 호출은 `error.code === 'cancelled'` 로 돌아온다 — retry storm 의 `rate_limit` 과 구분된다.

## Last Updated

2026-07-30 — dispatcher 계층의 정규화 계약을 문서화했다. 가짜 CLI 바이너리 픽스처는 소비자 10곳의 공통 조상인 `src/__tests__/fixtures/` 로 옮겨, 면책 선언 없이 경계를 지키게 했다.
