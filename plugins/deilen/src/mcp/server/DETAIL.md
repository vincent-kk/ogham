# server — Contract

## Requirements

- 서버 이름은 `'tools'` 로 고정한다 — `.mcp.json` 등록명과 일치해야 도구 전체 이름이 해석된다.
- 도구 4개를 zod `inputSchema` 와 함께 등록하고, 모든 콜백을 `wrapHandler` 로 감싼다.
- 기동 시 `loadConfig().session_ttl_hours` 로 만료 세션을 prune 하되, prune 이 실패해도 부팅은 계속한다.
- 종료 시 모든 resolver 를 settle 하고 HTTP 서버를 닫는다. 종료 핸들러는 `exit`·`SIGINT`·`SIGTERM` 과 stdin EOF(`end`/`close`)에 대해 1회만 등록한다 — 호스트가 신호 없이 파이프만 닫아도 리스너가 프로세스를 붙들지 않도록.
- stdout 은 stdio transport 전용이다 — 로그는 stderr 로만 쓰고, `serverEntry` 와 `registerShutdown` 의 종료 핸들러 밖에서는 `process.exit` 를 호출하지 않는다.

## API Contracts

- 종료 핸들러는 signal뿐 아니라 stdin EOF도 처리한다. 호스트가 파이프만 닫았는데 리스너가 프로세스를 붙드는 것을 막기 위해서다.
- 종료 입력 스트림의 주입은 테스트 격리를 위한 내부 seam이며 공개 서버 표면을 늘리는 이유가 아니다. 서버 등록과 시작 인자는 진입점을 읽는다.

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

서버 기동 복원력·stdin EOF 및 종료 정리 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
