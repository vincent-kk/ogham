# runList — Contract

## Requirements

- MCP 도구 `run_list` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 목록 조회는 "아직 아무것도 없음"을 정상 답으로 다룬다 — runs 디렉터리가 없으면 빈 목록이다. 특정 실행을 읽는 `run_get` 이 같은 상황을 오류로 다루는 것과 의도적으로 갈린다.
- 한 실행의 손상이 목록 전체를 무너뜨리지 않는다. `state.json` 을 읽지 못한 항목은 오류 표시를 달고 자리를 지키며, 나머지 항목은 그대로 보고된다.
- `project_ref` 생략은 정상 호출이다 — 설정의 `defaults.project_ref` 를 승계하고, 설정에도 없을 때만 거부한다.
- 읽기 전용이다(`readOnlyHint: true`). 목록 조회가 디렉터리를 만들지 않는다.

## API Contracts

- status는 실행 전체가 아닌 현재 phase의 상태다. BLOCKED 완료는 blocked로 보고하여 정상 완료라는 오독을 막는다.
- 목록은 `runIdGenerator`의 공통 비교로 날짜, 숫자 순번 순으로 오름차순 정렬한다. 같은 날짜의 `-999`는 `-1000`보다 먼저 나오며 ID 형식에 맞지 않는 항목은 무시한다.
- 손상 항목은 정상 상태 필드 대신 오류를 담는다. 소비자는 그 항목을 정상 실행으로 해석하지 않는다.

## Acceptance Criteria

### AC-per-run-degradation — 항목 단위 degrade

- 유효 ID를 가진 실행의 `state.json` 이 없거나 스키마를 벗어나면 `error: 'failed to load state'` 항목으로 나타나고, 같은 응답의 정상 실행 항목은 온전히 유지된다. ID 형식에 맞지 않는 항목은 목록에 포함하지 않는다.

## Last Updated

목록 부재·손상 항목·현재 단계 표시 계약의 내용과 근거가 바뀔 때 갱신한다.
