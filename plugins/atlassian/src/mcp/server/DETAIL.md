# server — Contract

## Requirements

- 서버 인스턴스를 만들고 도구 5개(`fetch`·`convert`·`auth_check`·`setup`·`jira_comment_thread`)를 등록한다.
- stdio transport 로만 통신한다. stdout 직접 쓰기를 하지 않고 로그는 stderr 로만 보낸다.
- 도구 입력 스키마는 zod 로 정의하고 MCP SDK 가 검증한다.
- 모든 `registerTool` 콜백은 `wrapHandler` 로 감싼다.
- 서비스 판별은 `args.service` 를 우선하고, 없으면 `detectService(endpoint)` 로 폴백한 뒤 core 에 위임한다.
- 이 fractal 의 외부 소비자는 배럴을 경유한다 — 내부 구현 파일을 직접 참조하지 않는다.

## API Contracts

- `createServer()` — 서버를 만들고 도구 5개를 등록한다.
- `startServer()` — stdio transport 로 연결한다.

## Acceptance Criteria

### AC-registration — 등록 규약

- 등록 도구가 정확히 5개이고 각 콜백이 `wrapHandler` 를 거친다.

### AC-stdout-reserved — stdout 보호

- 서버 코드가 stdout 에 직접 쓰지 않는다.

### AC-barrel-crossing — 경계 통과

- 이 fractal 밖에서 `server.ts` 를 직접 import 하지 않는다.

## Last Updated

2026-08-28 — `jira_comment_thread` 등록을 반영했다.
