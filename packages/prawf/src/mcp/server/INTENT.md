## Purpose

MCP 서버 인스턴스 생성과 stdio transport 연결을 담당하는 fractal. 현재 도구 0개 stub.

## Structure

| File                        | Role                              |
| --------------------------- | --------------------------------- |
| `lifecycle/createServer.ts` | `McpServer` 생성 (도구 등록 위치) |
| `lifecycle/startServer.ts`  | `StdioServerTransport` 연결       |
| `index.ts`                  | barrel                            |

## Conventions

- 서버 이름을 `'tools'` 로 고정 (`.mcp.json` 과 일치)
- 도구 추가 시 `registerTool` 콜백은 try/catch 래퍼로 감쌈
- transport 는 stdio — stdout 직접 쓰기 금지

## Boundaries

### Always do

- 서버 이름 `'tools'` 유지

### Ask first

- 새 도구 추가 또는 서버 이름·버전 옵션 변경

### Never do

- `process.exit` 를 핸들러에서 직접 호출
- stdout 직접 쓰기

## Dependencies

- `@modelcontextprotocol/sdk` — `McpServer`, `StdioServerTransport`
