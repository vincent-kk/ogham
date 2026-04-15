## Purpose

MCP server and 3 generic HTTP/utility tools. Zero domain knowledge — executes (method, path, params, body) tuples.

## Structure

| Directory | Role |
|---|---|
| `server/` | MCP server creation and tool registration |
| `server-entry/` | esbuild CJS bundle entry point |
| `shared/` | MCP tool response formatting (toolResult, toolError, wrapHandler) |
| `tools/` | 3 tool handlers (fetch, convert, setup) |
| `pages/` | Browser-side UI pages served by tools |

## Conventions

- 모든 tool 핸들러는 `wrapHandler`로 감싸 표준 에러 처리
- tool 응답은 `toolResult` / `toolError` 헬퍼로만 생성
- Zod 스키마로 입력 검증 후 core 레이어에 위임

## Dependencies

- `@modelcontextprotocol/sdk` — MCP 서버 및 tool 등록
- `zod` — tool 입력 스키마 검증
- `core/` — HTTP 실행, 인증, 설정 (단방향 의존)

## Boundaries

### Always do

- Register tools via server.registerTool() with Zod schemas
- Return standard McpResponse envelope from HTTP tools

### Ask first

- Add new MCP tool

### Never do

- Add domain knowledge (Jira/Confluence) to MCP layer
- Expose auth tokens in tool responses
