# mcp — Contract

## Requirements

- MCP 계층은 host 경계다: 프로토콜 입출력과 도구 등록만 담당하고 실행 정책은 `core` 에, 통계 정책은 `assertAnalysisPlan` 에 맡긴다.
- 서버 이름은 `'tools'` 로 고정한다 — 도구 전체 이름 `mcp__plugin_r-statistics_tools__*` 가 여기서 결정된다.
- 모든 도구 콜백은 `shared/wrapHandler` 를 거친다 — 핸들러 throw 가 서버를 죽이지 않는다.
- stdio 가 유일한 transport 이며 stdout 은 프로토콜 전용이다.
- 의존 방향은 `mcp → core` 한 방향이다. `core` 는 `mcp` 를 알지 못한다.

## API Contracts

- `createServer(): McpServer` · `startServer(): Promise<void>` — 서버 수명주기(소유: `server/`).
- `handleRunR` · `handleGetRJob` · `handleCancelRJob` · `handleAssertAnalysisPlan` — 도구 핸들러 4종(소유: `tools/`).
- `serverEntry/` 는 esbuild 진입점으로 `bridge/mcp-server.cjs` 를 만든다. 프로세스 종료를 다루는 유일한 자리다.

## Acceptance Criteria

### AC-mcp-boundary — host 경계 유지

- `mcp` 밖으로 나가는 의존이 `core`·`types`·`constants`·`lib`·`utils`·`version` 에 한정된다.
- `core` 에서 `mcp` 를 참조하는 import 가 0건이다.

### AC-mcp-transport — 전송 규약

- 등록 도구 4종이 모두 `wrapHandler` 를 거친다.
- `serverEntry` 를 제외한 어떤 파일도 `process.exit` 를 호출하지 않는다.

## Last Updated

2026-07-30 — MCP host 경계와 전송 규약을 문서화했다.
