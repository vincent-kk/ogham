# server — Contract

## Requirements

- 서버 이름은 `tools` 이며 도구 4개를 등록하고 stdio transport 로 연결한다.
- 모든 `registerTool` 콜백을 `wrapHandler` 로 감싸 비정상 throw 를 흡수한다.
- 입력 스키마는 zod 로 정의하고 MCP SDK 가 검증한다.
- stdout 은 transport 전용이다 — 로그는 stderr 로만 쓴다.
- 프로세스가 종료될 때 실행 중인 provider CLI 를 남기지 않는다.

## API Contracts

- `createServer()` — 서버를 만들고 도구 4개를 등록한다.
- `startServer()` — shutdown sweep 을 등록하고 stdio transport 로 연결한다.

## Acceptance Criteria

### AC-registration — 등록 규약

- 등록 도구가 정확히 4개이고 각 콜백이 `wrapHandler` 를 거친다.

### AC-stdout-reserved — stdout 보호

- 서버 코드가 stdout 에 직접 쓰지 않는다.

### AC-shutdown-sweep — 종료 시 정리

- exit / SIGINT / SIGTERM 에서 `stopRuns()` 가 1회 실행되어 원장의 실행이 전부 종료된다.
- 핸들러는 동기다 — 호스트가 주는 grace 는 실측 ~400ms 이고 그 뒤 SIGKILL 이 온다.
- 한계: Windows 그룹 종료는 `taskkill` 자식 프로세스를 띄우는 방식이라 grace 안에 끝난다는 보장이 없다. POSIX 는 `process.kill` 동기 호출이라 이 한계가 없다.

## Last Updated

2026-07-31 — 도구 4개(`stop_conversation` 추가)와 종료 sweep 계약을 문서화했다. sweep 이 필요한 이유는 POSIX 에서 자식이 부모와 함께 죽지 않고 reparent 되기 때문이다.
