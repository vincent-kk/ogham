## Purpose

MCP `tools` 서버의 lifecycle 모듈. 도구 4개를 등록하고, stdio 로 기동하며, 종료 시 resolver·HTTP 서버를 정리한다.

## Structure

| File                            | Role                                                             |
| ------------------------------- | ---------------------------------------------------------------- |
| `lifecycle/createServer.ts`     | `McpServer('tools')` + 도구 4개 `registerTool` (zod inputSchema) |
| `lifecycle/startServer.ts`      | 만료 세션 prune 후 stdio transport 로 connect                    |
| `lifecycle/registerShutdown.ts` | 종료 시 `settleAllResolvers` + HTTP 서버 close                   |
| `index.ts`                      | barrel — `createServer`, `startServer` re-export                 |

## Conventions

- 모든 `registerTool` 콜백은 `wrapHandler` 로 감쌈 (throw 흡수 + extra 전달)
- 도구 등록명은 snake_case (`render_viewer` 등), 심볼·파일은 camelCase
- 기동 시 `loadConfig().session_ttl_hours` 로 prune; 실패해도 부팅 계속
- shutdown 핸들러는 1회만 등록 (`exit`·`SIGINT`·`SIGTERM`)

## Boundaries

### Always do

- 서버 이름을 `'tools'` 로 고정
- `registerTool` 콜백을 `wrapHandler` 로 감싸기

### Ask first

- 새 도구 추가/이름 변경
- prune·shutdown 정책 변경

### Never do

- stdout 직접 쓰기 (stdio transport 전용; 로그는 stderr)
- 핸들러에서 `process.exit` 직접 호출

## Dependencies

- `@modelcontextprotocol/sdk` (`McpServer`, `StdioServerTransport`), `zod`
- `../../core`, `../shared`, `../tools`, `../httpServer`, `../../types`, `../../version`
