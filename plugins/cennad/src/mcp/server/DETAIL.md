# server — Contract

## Requirements

- 서버 이름은 `tools` 이며 도구 3개를 등록하고 stdio transport 로 연결한다.
- 모든 `registerTool` 콜백을 `wrapHandler` 로 감싸 비정상 throw 를 흡수한다.
- 입력 스키마는 zod 로 정의하고 MCP SDK 가 검증한다.
- stdout 은 transport 전용이다 — 로그는 stderr 로만 쓴다.

## API Contracts

- `createServer()` — 서버를 만들고 도구 3개를 등록한다.
- `startServer()` — stdio transport 로 연결한다.

## Acceptance Criteria

### AC-registration — 등록 규약

- 등록 도구가 정확히 3개이고 각 콜백이 `wrapHandler` 를 거친다.

### AC-stdout-reserved — stdout 보호

- 서버 코드가 stdout 에 직접 쓰지 않는다.

## Last Updated

2026-07-30 — 서버 등록 계약을 문서화했다.
