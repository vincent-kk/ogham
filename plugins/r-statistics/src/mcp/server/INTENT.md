## Purpose

MCP `tools` 서버 lifecycle 모듈. 도구 4개를 등록하고 stdio 로 기동하며, 종료 시 실행 중 잡을 정리한다. 서버 이름은 `tools` (`.mcp.json` 과 일치).

## Structure

| File                            | Role                                                       |
| ------------------------------- | ---------------------------------------------------------- |
| `lifecycle/createServer.ts`     | `McpServer('tools')` + 도구 4개 `registerTool`(zod schema) |
| `lifecycle/startServer.ts`      | 만료 워크스페이스 prune 후 stdio connect                  |
| `lifecycle/registerShutdown.ts` | 종료 시 `cancelAllJobs` (1회 등록)                         |
| `index.ts`                      | barrel — `createServer`, `startServer`                     |

## Conventions

- 모든 `registerTool` 콜백은 `wrapHandler` 로 감쌈 (throw 흡수)
- 도구 등록명 snake_case, 심볼·파일 camelCase
- 기동 시 prune 실패해도 부팅 계속

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

- `@modelcontextprotocol/sdk`, `zod`
- `../../core`, `../shared`, `../tools`, `../../constants`, `../../lib`, `../../types`, `../../version`
