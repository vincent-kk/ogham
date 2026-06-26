## Purpose

`cancel-r-job` 도구 핸들러. 실행 중 R 잡을 AbortController 로 SIGKILL 종료하고 상태를 Cancelled 로 전이한다. idempotent.

## Structure

| File            | Role                                         |
| --------------- | -------------------------------------------- |
| `cancelRJob.ts` | 핸들러 — `cancelJob` 위임, CancelStatus 반환 |
| `index.ts`      | barrel                                       |

## Conventions

- 반환: `cancelled` | `already_finished` | `not_found`
- 종료 상태 잡 취소는 `already_finished` (재호출 안전)

## Boundaries

### Always do

- 취소 시 spawn 자식에 SIGKILL 전파

### Ask first

- 취소 정책(종료 상태 처리) 변경

### Never do

- 결과 조회·재실행 (get-r-job / run-r 소관)

## Dependencies

- `../../../core` (jobStore), `../../../types/enums`
