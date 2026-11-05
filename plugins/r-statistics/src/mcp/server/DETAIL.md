# server — Contract

## Requirements

- 서버 이름은 `'tools'` 로 고정한다 — `.mcp.json` 등록명과 일치해야 도구 이름이 해석된다.
- 등록하는 모든 콜백은 `wrapHandler` 로 감싼다.
- 기동은 stdio transport 만 사용한다. stdout 은 프로토콜 채널이므로 로그는 stderr 로만 쓴다.
- 기동 전 만료 워크스페이스를 정리하고, 종료 시 실행 중 잡을 모두 취소한다. 종료 훅은 한 번만 등록한다. 서버 종료 뒤 R 자식이 남는 것을 막는다.
- 도구 핸들러에서 `process.exit` 를 직접 호출하지 않는다. 기동 실패의 종료는 실행 진입점이, 종료 신호의 잡 취소와 종료는 서버 수명주기가 소유하여 요청 실패가 서버 종료로 번지지 않게 한다.

## API Contracts

- 만료 정리 실패는 경고로 남기고 기동을 계속한다. 정리 작업이 MCP 접근까지 차단해서는 안 된다.

## Acceptance Criteria

### AC-server-registration — 등록 규약

- 등록된 도구가 정확히 4개이며 이름이 snake_case 로 `.mcp.json` 계약과 일치한다.
- 모든 `registerTool` 콜백이 `wrapHandler` 를 거친다.

### AC-server-lifecycle — 수명주기

- 기동 경로는 stdio 하나뿐이고 stdout 직접 쓰기가 없다.
- 종료 시 살아 있는 잡이 모두 취소된다.

## Last Updated

도구 등록·오류 표면·서버 수명주기 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
