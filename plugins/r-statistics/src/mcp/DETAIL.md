# mcp — Contract

## Requirements

- MCP 계층은 host 경계다: 프로토콜 입출력과 도구 등록만 담당하고 실행 정책은 `core` 에, 통계 정책은 `assertAnalysisPlan` 에 맡긴다.
- 서버 이름은 `'tools'` 로 고정한다 — 도구 전체 이름 `mcp__plugin_r-statistics_tools__*` 가 여기서 결정된다.
- 모든 도구 콜백은 `wrapHandler` 를 거친다 — 핸들러 throw 가 서버를 죽이지 않는다.
- stdio 가 유일한 transport 이며 stdout 은 프로토콜 전용이다.
- 의존 방향은 `mcp → core` 한 방향이다. `core` 는 `mcp` 를 알지 못한다.

## API Contracts

- 기동 실패의 프로세스 종료는 실행 진입점이, 종료 신호에 따른 잡 취소와 프로세스 종료는 서버 수명주기가 소유한다. 도구 핸들러의 실패가 서버 수명주기를 끝내지 않게 한다.

## Acceptance Criteria

### AC-mcp-boundary — host 경계 유지

- `mcp` 밖으로 나가는 의존이 `core`·`types`·`constants`·`lib`·`utils`·`version` 에 한정된다.
- `core` 에서 `mcp` 를 참조하는 import 가 0건이다.

### AC-mcp-transport — 전송 규약

- 등록 도구 4종이 모두 `wrapHandler` 를 거친다.
- `process.exit` 호출은 실행 진입점과 서버의 종료 신호 콜백으로 한정하며 도구 핸들러에서는 금지한다.

## Last Updated

MCP 전송·응답·프로세스 수명 경계의 내용이나 적용 범위가 바뀔 때 갱신한다.
