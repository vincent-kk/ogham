## Purpose

r-statistics 의 MCP 서버(stdio) 프랙탈. 도메인 무지·stateless 결정적 실행 레이어. 도구 4종 등록·실행을 담당하며 서버 이름은 `tools`.

## Structure

| Path           | Role                                                   |
| -------------- | ------------------------------------------------------ |
| `server/`      | createServer(도구 등록) + startServer(stdio) (fractal) |
| `serverEntry/` | esbuild 진입점 → `bridge/mcp-server.cjs` (organ)       |
| `shared/`      | toolResult·toolError·wrapHandler (fractal)             |
| `tools/`       | run-r·get-r-job·cancel-r-job·assert-analysis-plan      |
| `index.ts`     | barrel                                                 |

## Conventions

- 모든 `registerTool` 콜백은 `wrapHandler` 로 감쌈
- 도구 등록명 snake_case, 심볼·파일 camelCase
- stdio transport 만 — stdout 직접 쓰기 금지(stderr 로그만)

## Boundaries

### Always do

- 서버 이름을 `'tools'` 로 고정
- `registerTool` 콜백을 `wrapHandler` 로 감싸기

### Ask first

- 새 도구 추가/이름 변경

### Never do

- 핸들러에서 `process.exit` 직접 호출(serverEntry 제외)
- 통계 정책·도메인 어휘를 실행 레이어에 도입

## Dependencies

- `@modelcontextprotocol/sdk`, `zod`
- `../core`, `../constants`, `../types`, `../lib`, `../utils`, `../version`
