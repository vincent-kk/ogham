## Purpose

MCP 서버 인스턴스 생성, 3개 도구 등록, stdio transport 연결을 담당하는 fractal.

## Structure

| File              | Role                                                     |
| ----------------- | -------------------------------------------------------- |
| `createServer.ts` | `McpServer` 인스턴스 생성 + 3개 도구 `registerTool` 등록 |
| `startServer.ts`  | `StdioServerTransport` 생성 후 `server.connect` 호출     |
| `index.ts`        | barrel                                                   |

## Conventions

- 모든 `registerTool` 콜백은 `wrapHandler` 로 감쌈 (비정상 throw 흡수)
- transport 는 stdio 만 사용 — stderr 로그만 허용, stdout 직접 쓰기 금지
- 도구 입력 스키마는 `zod` 로 정의 (MCP SDK 가 자동 검증)

## Boundaries

### Always do

- `registerTool` 콜백을 `wrapHandler` 로 감싸기
- 서버 이름을 `'tools'` 로 고정 (`.mcp.json` 과 일치)

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
- `../tools/openSettings` — `handleOpenSettings`
- `../shared/wrapHandler` — 핸들러 try/catch 래퍼
