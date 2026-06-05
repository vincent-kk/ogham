## Purpose

`@ogham/prawf` MCP 계층. esbuild 가 `bridge/mcp-server.cjs` 로 번들링하는 stdio MCP 서버 fractal. 현재 도구 0개 stub — capability 확정 시 `server/` 에 도구를 등록한다.

## Structure

| Directory      | Role                                      |
| -------------- | ----------------------------------------- |
| `serverEntry/` | esbuild 번들 진입점 (`startServer` 호출)  |
| `server/`      | `McpServer` 생성 + 도구 등록 + stdio 연결 |

## Conventions

- 서버 이름은 `'tools'` 고정 (`.mcp.json` 과 일치)
- transport 는 stdio — stderr 로그만, stdout 직접 쓰기 금지
- 도구 입력 스키마는 `zod` (도구 추가 시)

## Boundaries

### Always do

- 공개 API 는 `index.ts` 에서 re-export

### Ask first

- 새 도구 추가 또는 서버 이름 변경
- `McpServer` 생성 옵션 변경

### Never do

- stdout 직접 쓰기 (transport 외 경로)
- `process.exit` 를 도구 핸들러에서 호출

## Dependencies

- `@modelcontextprotocol/sdk` — `McpServer`, `StdioServerTransport`
