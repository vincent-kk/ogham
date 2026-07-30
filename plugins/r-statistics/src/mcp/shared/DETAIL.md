# shared — Contract

## Requirements

- 도구 핸들러는 평문 데이터를 반환하고, MCP 결과 직렬화는 이 모듈이 전담한다.
- 핸들러에서 던져진 값은 프로세스를 죽이지 않고 에러 봉투로 변환된다.
- 호출자의 취소 신호(`extra.signal`)는 핸들러까지 그대로 전달된다.
- 이미 MCP content 형태인 결과는 다시 감싸지 않고 그대로 통과시킨다.

## API Contracts

- `toolResult(result: unknown): CallToolResult` — 평문 데이터를 단일 JSON text content 블록으로 직렬화한다.
- `toolError(error: unknown): CallToolResult` — 던져진 값을 `isError: true` 인 `Error: <message>` 봉투로 변환한다.
- `wrapHandler<T>(...)` — 핸들러를 감싸 throw 를 흡수하고 `extra`(`ToolExtra`)와 `signal` 을 전달한다. content 결과는 passthrough.
- `type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>`

## Acceptance Criteria

### AC-handler-envelope — 응답 봉투 일관성

- 평문 반환값은 단일 JSON text content 로 직렬화된다.
- 핸들러가 던진 값은 `isError: true` 봉투가 되고 예외는 밖으로 새지 않는다.
- 이미 content 형태인 결과는 이중 포장되지 않는다.

## Last Updated

2026-07-30 — 응답 직렬화·에러 봉투 계약을 문서화했다.
