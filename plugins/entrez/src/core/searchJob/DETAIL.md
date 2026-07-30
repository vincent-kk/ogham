# searchJob — Contract

## Requirements

- MCP 동기 응답 시간을 넘는 검색은 job 으로 돌린다. job 레코드는 디스크에 영속하며 항상 0o600 으로 기록한다.
- 읽기와 쓰기 모두 `JobRecordSchema` 로 검증한다 — 손상된 레코드를 그대로 신뢰하지 않는다.
- 경로·시계·id 는 주입할 수 있다. 테스트가 결정적으로 재현할 수 있어야 한다.
- `updatedAt` 은 쓰기마다 갱신하고 `jobId` 는 기존 값을 유지한다.
- 결과 조회는 cursor 페이지네이션으로 `union.records` 를 잘라 돌려준다.

## API Contracts

- `createJob(options: CreateJobOptions)` — `QUEUED` 레코드를 만들고 0o600 으로 기록한다.
- `getJob(id, options?: JobPathOptions)` — 없으면 `null`.
- `updateJob(options: UpdateJobOptions)` — 부분 패치·상태 전이·`updatedAt` 갱신.
- `pollResults(options: PollOptions): PollResult` — 상태와 진행률, cursor 기반 결과 페이지.

## Acceptance Criteria

### AC-job-persistence — 영속과 검증

- 기록된 job 파일 권한이 0o600 이다.
- 스키마를 통과하지 못하는 레코드는 읽기에서 거부된다.

### AC-job-update-invariants — 갱신 불변식

- 갱신마다 `updatedAt` 이 바뀐다.
- `jobId` 는 갱신으로 바뀌지 않는다.

### AC-job-pagination — 결과 페이지네이션

- cursor 로 이어 읽으면 레코드가 중복되거나 누락되지 않는다.

## Last Updated

2026-07-30 — 비동기 검색 job 계약을 문서화했다.
