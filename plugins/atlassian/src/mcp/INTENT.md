## Purpose

MCP server, 4 generic HTTP/utility tools, and approved domain adapters (currently `jira_comment_thread`). Generic tools carry zero domain knowledge — they execute (method, path, params, body) tuples; adapters only call `src/jira/` entry points.

## Structure

| Directory      | Role                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `server/`      | MCP server creation and tool registration                                                         |
| `serverEntry/` | esbuild CJS bundle entry point                                                                    |
| `shared/`      | MCP tool response formatting (toolResult, toolError, wrapHandler)                                 |
| `tools/`       | 4 generic tool handlers (fetch, convert, auth_check, setup) + domain adapter `jiraCommentThread/` |
| `pages/`       | Browser-side UI pages served by tools                                                             |

## Conventions

- 모든 tool 핸들러는 `wrapHandler`로 감싸 표준 에러 처리
- tool 응답은 `toolResult` / `toolError` 헬퍼로만 생성
- Zod 스키마로 입력 검증 후 core 레이어에 위임

## Dependencies

- `@modelcontextprotocol/sdk` — MCP 서버 및 tool 등록
- `zod` — tool 입력 스키마 검증
- `core/` — HTTP 실행, 인증, 설정 (단방향 의존)
- `jira/` — 도메인 레시피 entry point (jiraCommentThread 어댑터만)

## Boundaries

### Always do

- Register tools via server.registerTool() with Zod schemas
- Return standard McpResponse envelope from HTTP tools

### Ask first

- Add new MCP tool

### Never do

- Add domain rules (Jira/Confluence field meaning, merge logic) to generic tools, `shared/` or `server/` — adapters may only call `src/jira/` entry points
- Expose auth tokens in tool responses
