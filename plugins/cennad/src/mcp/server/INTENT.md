## Purpose

MCP 서버 인스턴스 생성, 4개 도구 등록, stdio transport 연결을 담당하는 fractal.

## Structure

| File                        | Role                                                     |
| --------------------------- | -------------------------------------------------------- |
| `lifecycle/createServer.ts` | `McpServer` 인스턴스 생성 + 4개 도구 `registerTool` 등록 |
| `lifecycle/startServer.ts`  | shutdown sweep 등록 + 만료 세션 prune + transport 연결   |
| `index.ts`                  | barrel                                                   |

## Conventions

- 모든 `registerTool` 콜백은 `wrapHandler` 로 감쌈 (비정상 throw 흡수)
- transport 는 stdio 만 사용 — stderr 로그만 허용, stdout 직접 쓰기 금지
- 도구 입력 스키마는 `zod` 로 정의 (MCP SDK 가 자동 검증)
- 서버 버전은 인자로 받는다 — 이 fractal 은 `version.ts` 를 읽지 않는다 (읽으면 `src` 로 되돌아가는 엣지가 생겨 순환)
- 종료 시 `stopRuns()` 로 실행 중인 provider CLI 를 전부 정리한다. POSIX 에서 자식은 부모와 함께 죽지 않고 reparent 되므로, 정리하지 않으면 서버가 사라진 뒤에도 liveness 상한까지 돈다. 호스트가 주는 grace 는 실측 ~400ms 라 핸들러는 동기만 (`@ogham/session-finalizer` Type C)

## Boundaries

### Always do

- `registerTool` 콜백을 `wrapHandler` 로 감싸기
- 서버 이름을 `'tools'` 로 고정 (`.mcp.json` 과 일치), 버전은 호출자가 넘긴 값 사용

### Ask first

- 새 도구 추가 또는 기존 도구 이름 변경
- `McpServer` 생성 옵션 변경 (name / version)

### Never do

- `process.exit` 를 핸들러에서 직접 호출
- stdout 직접 쓰기 (transport 외 경로 사용)

## Dependencies

- `@modelcontextprotocol/sdk` — `McpServer`, `StdioServerTransport`
- `../tools/startConversation` — `handleStartConversation`
- `../tools/continueConversation` — `handleContinueConversation`
- `../tools/stopConversation` — `handleStopConversation`
- `../tools/openSettings` — `handleOpenSettings`
- `../../dispatcher` — `stopRuns` (종료 sweep), `@ogham/session-finalizer` — `registerShutdownFinalizer`
- `../shared/wrapHandler` — 핸들러 try/catch 래퍼
