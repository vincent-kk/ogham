# server — Contract

## Requirements

- 서버 이름은 `'tools'` 로 고정한다 — `.mcp.json` 등록명과 일치해야 도구 전체 이름이 해석된다.
- 도구 4개를 zod `inputSchema` 와 함께 등록하고, 모든 콜백을 `wrapHandler` 로 감싼다.
- 기동 시 `loadConfig().session_ttl_hours` 로 만료 세션을 prune 하되, prune 이 실패해도 부팅은 계속한다.
- 종료 시 모든 resolver 를 settle 하고 HTTP 서버를 닫는다. 종료 핸들러는 `exit`·`SIGINT`·`SIGTERM` 과 stdin EOF(`end`/`close`)에 대해 1회만 등록한다 — 호스트가 신호 없이 파이프만 닫아도 리스너가 프로세스를 붙들지 않도록.
- stdout 은 stdio transport 전용이다 — 로그는 stderr 로만 쓰고, `serverEntry` 와 `registerShutdown` 의 종료 핸들러 밖에서는 `process.exit` 를 호출하지 않는다.

## API Contracts

- `createServer(): McpServer` — 이름 `'tools'` 인 서버에 도구 4개를 등록해 돌려준다.
- `startServer(): Promise<void>` — 만료 세션 prune 후 stdio 로 연결한다.
- `registerShutdown(input = process.stdin): void` — `settleAllResolvers` 와 HTTP 서버 close 를 신호·`exit`·stdin EOF 시점에 1회 등록한다(모듈 내부 소비; `input` 은 테스트가 스트림을 주입하기 위한 매개변수).

## Acceptance Criteria

### AC-server-registration — 등록 규약

- 등록 도구가 정확히 4개이고 이름이 `.mcp.json` 계약과 일치한다.
- 모든 `registerTool` 콜백이 `wrapHandler` 를 거친다.

### AC-server-shutdown — 종료 정리

- 종료 시 대기 중이던 long-poll resolver 가 모두 settle 된다.
- 종료 핸들러가 중복 등록되지 않는다.
- stdin 이 EOF 에 이르면 HTTP 서버가 닫히고 프로세스가 종료 코드 0 으로 빠져나가며, `end` 와 `close` 가 연달아 와도 종료 루틴은 한 번만 돈다.

### AC-server-boot-resilience — 기동 복원력

- prune 실패가 부팅을 막지 않는다.

## Last Updated

2026-08-25 — stdin EOF 를 종료 경로에 추가했다.
