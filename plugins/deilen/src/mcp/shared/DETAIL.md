# shared — Contract

## Requirements

- 도구 핸들러는 평문 데이터를 반환하고, MCP 결과 직렬화는 이 모듈이 전담한다.
- 핸들러가 던진 값은 서버를 죽이지 않고 에러 봉투가 된다.
- `extra.signal` 은 항상 핸들러에 전달한다 — `collect_feedback` 의 long-poll abort 가 이것에 의존한다.
- 이미 `CallToolResult`(content 배열) 형태인 결과는 다시 감싸지 않는다.

## API Contracts

- `toolResult(result: unknown): CallToolResult` — 평문 데이터를 단일 JSON text content 블록으로 직렬화한다.
- `toolError(error: unknown): CallToolResult` — 던져진 값을 `isError: true` 인 `Error: <message>` 봉투로 변환한다. `Error` 인스턴스면 `.message`, 아니면 `String(value)` 를 쓴다.
- `wrapHandler(...)` — throw 를 흡수하고 `extra`(`ToolExtra`)와 `signal` 을 전달한다. content 결과는 passthrough.
- `type ToolExtra` — MCP SDK 의 요청 부가 정보 타입.

## Acceptance Criteria

### AC-handler-envelope — 응답 봉투 일관성

- 평문 반환값은 단일 JSON text content 로 직렬화된다.
- 핸들러가 던진 값은 `isError: true` 봉투가 되고 예외는 밖으로 새지 않는다.
- 이미 content 형태인 결과는 이중 포장되지 않는다.

### AC-signal-passthrough — 취소 신호 전달

- `extra.signal` 이 핸들러까지 도달해 long-poll 이 abort 될 수 있다.

## Last Updated

2026-07-30 — 응답 직렬화·에러 봉투·신호 전달 계약을 문서화했다.
