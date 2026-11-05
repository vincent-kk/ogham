# dispatcher — Contract

## Requirements

- MCP 도구 핸들러가 준 `DispatchOptions` 를 외부 CLI 실행으로 바꾸고, 결과와 에러를 `ConversationResponse` envelope 로 정규화한다.
- CLI 종료·진단·취소 신호의 공통 `ErrorCode` 분류는 `errorMap`에 모아 provider별 패턴 해석의 분기를 막는다. CLI 가 사유를 보고하지 않은 종료 코드 0의 출력 계약 위반 두 가지에만 직접 코드를 허용한다: Codex 세션 참조 누락은 `unknown`, 복구할 수 없는 Antigravity 빈 출력은 `cli_error`로 유지한다. CLI 가 구조화 출력으로 보고한 실패 사유는 종료 코드 0 이어도 `errorMap` 을 거친다.
- 모든 CLI 호출은 `@ogham/cross-platform` 을 경유한다 — `child_process` 를 직접 쓰지 않는다.
- provider 별 세션 참조 방식이 다르다: codex 는 thread UUID, claude 는 주입한 `--session-id`, antigravity 는 스트림이 노출한 conversation id(없으면 cwd 격리).
- 가짜 CLI 바이너리 픽스처는 소비자들의 공통 조상인 `src/__tests__/fixtures/`에 둔다. dispatcher 아래에 한정하지 않고 공통 위치에서 공유해 경계 면책에 의존하지 않는다.

## API Contracts

- 실행 원장의 유일한 쓰기 주체는 dispatcher다. provider 어댑터가 spawn 직전에 등록하고, 외부에는 중단 표면만 노출한다.
- 원장을 자식 fractal로 승격하거나 dispatcher 밖으로 옮기지 않는다. spawn하지 않는 모듈이 실행 상태를 소유하게 되고 어댑터가 남의 경계에 상태를 기록하게 되기 때문이다.
- 외부 소비는 dispatcher 엔트리포인트 경유로 제한하며 원장 organ 파일 직접 import는 허용하지 않는다.

## Acceptance Criteria

### AC-envelope-normalization — 봉투 정규화

- 성공·실패 모두 `ConversationResponse` 형태로 돌아온다.
- 공통 오류 분류는 `errorMap`을 거치며, 어댑터의 직접 코드는 위 출력 계약 검증에 한정한다.

### AC-cli-via-cross-platform — CLI 호출 경유

- `child_process` 직접 호출이 0건이다.

### AC-run-cancellable — 실행 중 CLI 취소 가능

- 세 provider 모두 spawn 을 `withActiveRun` 으로 감싸 원장에 등록한다.
- 호출자 signal abort 또는 `stopRuns` 는 CLI 를 프로세스 그룹째 SIGKILL 한다 (`detached: true`).
- 취소로 끝난 호출은 `error.code === 'cancelled'` 로 돌아온다 — retry storm 의 `rate_limit` 과 구분된다.

## Last Updated

provider 정규화·실행 원장 소유권·취소 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
