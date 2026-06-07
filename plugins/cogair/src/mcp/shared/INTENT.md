## Purpose

MCP 도구 핸들러가 공유하는 응답 envelope 직렬화 함수와 try/catch 래퍼. organ-like 헬퍼 모음.

## Structure

| File             | Role                                                   |
| ---------------- | ------------------------------------------------------ |
| `toolResult.ts`  | 성공 응답을 compact JSON `content` 배열로 직렬화       |
| `toolError.ts`   | 실패 envelope (`isError: true`) 생성                   |
| `wrapHandler.ts` | 핸들러 try/catch — 비정상 throw 를 `toolError` 로 흡수 |
| `index.ts`       | barrel                                                 |

## Conventions

- `COGAIR_PRETTY_JSON=1` 환경 변수로 pretty-print 활성화 (디버그용)
- `ConversationResponse` envelope 형태는 모든 도구에서 동일하게 유지
- `wrapHandler` 는 wrap-only — 정상 envelope 생성은 각 핸들러 책임

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
