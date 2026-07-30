# server — Contract

## Requirements

- 서버 이름은 `'tools'` 로 고정한다 — `.mcp.json` 등록명과 일치해야 도구 전체 이름이 해석된다.
- 도구 4개를 zod `inputSchema` 와 함께 등록하고, 모든 콜백을 `wrapHandler` 로 감싼다.
- 기동 시 `loadConfig().session_ttl_hours` 로 만료 세션을 prune 하되, prune 이 실패해도 부팅은 계속한다.
- 종료 시 모든 resolver 를 settle 하고 HTTP 서버를 닫는다. 종료 핸들러는 `exit`·`SIGINT`·`SIGTERM` 에 대해 1회만 등록한다.
- stdout 은 stdio transport 전용이다 — 로그는 stderr 로만 쓰고, `serverEntry` 밖에서 `process.exit` 를 호출하지 않는다.

## API Contracts

- `createServer(): McpServer` — 이름 `'tools'` 인 서버에 도구 4개를 등록해 돌려준다.
- `startServer(): Promise<void>` — 만료 세션 prune 후 stdio 로 연결한다.
- `registerShutdown(): void` — `settleAllResolvers` 와 HTTP 서버 close 를 종료 시점에 1회 등록한다(모듈 내부 소비).

## Acceptance Criteria

### AC-server-registration — 등록 규약

- 등록 도구가 정확히 4개이고 이름이 `.mcp.json` 계약과 일치한다.
- 모든 `registerTool` 콜백이 `wrapHandler` 를 거친다.

### AC-server-shutdown — 종료 정리

- 종료 시 대기 중이던 long-poll resolver 가 모두 settle 된다.
- 종료 핸들러가 중복 등록되지 않는다.

### AC-server-boot-resilience — 기동 복원력

- prune 실패가 부팅을 막지 않는다.

## Last Updated

2026-07-30 — 서버 등록·종료 계약을 문서화했다.
