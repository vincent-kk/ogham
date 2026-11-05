# runGet — Contract

## Requirements

- MCP 도구 `run_get` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 두 인자 모두 생략 가능한 것이 이 도구의 요점이다 — 스킬이 "지금 이 프로젝트의 최신 실행"을 인자 없이 집을 수 있어야 한다. `project_ref` 는 설정의 `defaults.project_ref` 를, `run_id` 는 runs 디렉터리의 마지막 항목을 승계한다.
- 실행이 하나도 없으면 빈 결과가 아니라 오류다 — 이 도구는 특정 실행의 상태를 읽는 도구이며, 목록 조회는 `run_list` 의 일이다.
- 상태 로드는 `stateManager` 의 `loadRunState` 가 소유한다. `state.json` 파싱을 여기서 다시 구현하지 않는다.
- 읽기 전용이다(`readOnlyHint: true`). 조회가 실행 디렉터리를 만들거나 고치지 않는다.

## API Contracts

- 최신 실행의 사전순 선택은 실행 ID의 고정폭이 생성순과 같다는 전제에 의존한다.
- 사용 가능한 매니페스트는 파일 존재만 뜻하며 내용의 유효성을 보증하지 않는다.
- 기본 project_ref도 없거나 실행 디렉터리가 없거나 비면 각각 거부한다. 상태 파일의 부재·검증 실패는 상태 로더가 보고한다.

## Acceptance Criteria

### AC-latest-run-default — 최신 실행 승계

- `run_id` 없이 호출하면 runs 디렉터리의 사전순 마지막 실행 상태를 반환한다.
- runs 디렉터리가 없거나 비면 각각을 구분하는 문장으로 오류 응답이 된다.

## Last Updated

최신 실행 선택·부재·매니페스트 조회 계약의 내용과 근거가 바뀔 때 갱신한다.
