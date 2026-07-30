# jobStore — Contract

## Requirements

- 비동기 R 잡의 생명주기를 인메모리로만 관리한다 — 프로세스 재시작 뒤에도 남는 상태를 만들지 않는다.
- 잡은 `queued` 로 등록되고, 상태 전이와 함께 결과가 붙는다.
- 취소는 등록된 `AbortController` 를 통해 이루어지며, 이미 끝난 잡과 없는 잡을 서로 다른 결과로 구분해 보고한다.
- 보관 상한을 넘으면 종료된 잡부터 오래된 순으로 제거하고, 실행 중인 잡은 제거하지 않는다.

## API Contracts

- `createJob(input: CreateJobInput): RJob` — 잡을 `queued` 상태로 등록한다.
- `getJob(jobId: string): RJob | undefined` — 등록된 잡 조회.
- `updateJob(...)` — 상태 전이와 결과 부착. 없는 잡에 대한 갱신은 no-op 이다.
- `cancelJob(jobId: string): CancelStatus` — 실행 중 잡의 `AbortController` 를 abort 하고 취소 상태로 전이. 종료 상태면 `already_finished`, 미등록이면 `not_found`.
- `cancelAllJobs(): void` — 살아 있는 모든 잡을 abort 한다. 종료 훅이 소비한다.
- `hasActiveWorkspaceJob(workspaceId: string): boolean` — 해당 워크스페이스에 실행 중 잡이 있는지 판정.
- `pruneJobs(max = MAX_TRACKED_JOBS): void` — 상한 초과분을 종료된 잡부터 오래된 순으로 제거한다.

## Acceptance Criteria

### AC-job-lifecycle — 상태 전이

- 새 잡은 `queued` 로 등록된다.
- 상태 전이 시 결과가 함께 부착된다.
- 실행 중 잡 취소는 해당 컨트롤러를 abort 한다.
- 이미 끝난 잡은 `already_finished`, 없는 잡은 `not_found` 로 구분된다.

### AC-job-eviction — 보관 상한

- 상한 초과 시 오래된 종료 잡부터 제거하고 실행 중 잡은 보존한다.
- `cancelAllJobs` 는 살아 있는 모든 잡을 abort 한다.
- 워크스페이스별 활성 잡 존재 여부를 판정할 수 있다.

## Last Updated

2026-07-30 — 잡 생명주기와 축출 계약을 문서화했다.
