# getRJob — Contract

## Requirements

- `get_r_job` 은 읽기 전용이다 — 잡 상태를 바꾸지 않으며 같은 입력에 몇 번을 불러도 같은 관측을 준다.
- 조회는 `jobStore` 한 곳만 본다. 워크스페이스를 다시 읽거나 R 을 실행하지 않는다.
- `includeStdout` 기본값은 참이고, 거짓이면 stdout/stderr 텍스트를 비운다(인코딩 정보는 유지) — 폴링이 큰 페이로드를 반복 전송하지 않게 한다.
- 없는 `jobId` 조회는 `JOB_NOT_FOUND` 로 throw 한다 — 상태 봉투로 감추지 않는다.

## API Contracts

- `handleGetRJob(input: GetRJobInput): Promise<RunROutput>` — 잡 상태와 종료 시 결과를 돌려준다. `includeStdout=false` 면 스트림 텍스트를 비우고, 미존재 잡이면 `JOB_NOT_FOUND` 로 throw 한다.
- `interface GetRJobInput` — 조회 대상 잡 식별자와 stdout 포함 여부.

## Acceptance Criteria

### AC-getjob-readonly — 읽기 전용 폴링

- 같은 잡을 반복 조회해도 잡 상태가 바뀌지 않으며 새 실행이 트리거되지 않는다.
- `includeStdout=false` 응답에 스트림 본문이 남지 않는다.
- 미존재 잡 조회는 `JOB_NOT_FOUND` 로 실패한다.

## Last Updated

2026-07-30 — 폴링 도구의 읽기 전용 계약을 문서화했다.
