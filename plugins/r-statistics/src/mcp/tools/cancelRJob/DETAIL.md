# cancelRJob — Contract

## Requirements

- `cancel_r_job` 은 idempotent 하다 — 같은 잡을 두 번 취소해도 오류가 아니라 상태로 답한다.
- 취소는 `jobStore.cancelJob` 에 위임한다. 이 도구는 프로세스를 직접 죽이지 않는다.
- 이미 끝난 잡과 존재하지 않는 잡은 서로 다른 상태로 구분해 보고한다.

## API Contracts

- `handleCancelRJob(input: CancelRJobInput): Promise<CancelRJobOutput>` — 대상 잡을 취소하고 `CancelStatus` 를 담은 결과를 돌려준다.
- `interface CancelRJobInput` — 취소 대상 잡 식별자.
- `interface CancelRJobOutput` — 취소 결과 상태.

## Acceptance Criteria

### AC-cancel-idempotence — 반복 취소 안전성

- 실행 중 잡 취소는 해당 잡의 `AbortController` 를 abort 한다.
- 종료된 잡 취소는 `already_finished`, 미등록 잡 취소는 `not_found` 로 답하며 둘 다 예외를 던지지 않는다.

## Last Updated

2026-07-30 — 취소 도구의 idempotent 계약을 문서화했다.
