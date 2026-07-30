## Purpose

MCP 도구 핸들러가 공유하는 응답 envelope 직렬화 함수와 try/catch 래퍼. organ-like 헬퍼 모음.

## Structure

| File             | Role                                             |
| ---------------- | ------------------------------------------------ |
| `toolResult.ts`  | 성공 응답을 compact JSON `content` 배열로 직렬화 |
| `toolError.ts`   | 실패 envelope (`isError: true`) 생성             |
| `wrapHandler.ts` | 핸들러 try/catch + 요청 취소 신호 전달           |
| `index.ts`       | barrel                                           |

## Conventions

- `CENNAD_PRETTY_JSON=1` 환경 변수로 pretty-print 활성화 (디버그용)
- `ConversationResponse` envelope 형태는 모든 도구에서 동일하게 유지
- `wrapHandler` 는 wrap-only — 정상 envelope 생성은 각 핸들러 책임
- `wrapHandler` 는 SDK 요청 컨텍스트(`extra`)의 `signal` 을 핸들러 2번째 인자로 넘긴다. 호스트가 `notifications/cancelled` 를 보내면 SDK 가 abort 시키는 그 신호이며, 외부 CLI 를 띄우는 도구에는 유일한 조기 종료 경로다. 취소를 다루지 않는 핸들러는 인자를 선언하지 않으면 된다

## Boundaries

### Always do

- 모든 `registerTool` 핸들러를 `wrapHandler` 로 감싸기

### Ask first

- `ConversationResponse` envelope 형태 변경
- `toolResult` / `toolError` 직렬화 방식 변경

### Never do

- `process.exit` 호출
- stdout 직접 출력

## Dependencies

- `@modelcontextprotocol/sdk` — `CallToolResult` 반환 타입
- `../../types` — `ConversationResponse`
- `../../utils/mapReplacer` — `Map` 직렬화 (`toolResult` 내부)
