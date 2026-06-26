## Purpose

비동기 R 잡 인메모리 레지스트리. 장수 MCP 서버 프로세스 동안 잡의 생명주기(queued→running→succeeded/failed/timeout/cancelled)와 AbortController·결과를 추적한다. `run-r`·`get-r-job`·`cancel-r-job` 세 도구가 공유한다.

## Structure

| File                      | Role                                                   |
| ------------------------- | ------------------------------------------------------ |
| `jobStore.ts`             | `jobs` Map(프로세스 수명 상태) + RJob 타입 (eponymous) |
| `operations/createJob.ts` | Queued 상태로 등록                                     |
| `operations/getJob.ts`    | id 조회                                                |
| `operations/updateJob.ts` | 상태 전이 + 결과 부착                                  |
| `operations/cancelJob.ts` | controller.abort + Cancelled 처리, CancelStatus 반환   |
| `index.ts`                | barrel                                                 |

## Conventions

- 잡은 휘발성 런타임 상태 — 디스크 영속화 안 함(워크스페이스 산출물과 구분)
- 종료 상태(succeeded/failed/timeout/cancelled)에서 cancel 은 `already_finished`
- operations 는 `../jobStore.js` 의 `jobs` Map 을 직접 import

## Boundaries

### Always do

- 취소 시 `AbortController.abort()` 로 spawn 종료 신호 전파
- 미존재 잡 업데이트는 no-op

### Ask first

- 잡 상태를 디스크에 영속화하는 방향 전환

### Never do

- 잡 레지스트리에 통계 결과 해석·정책 저장
- spawn·아티팩트 수집 직접 수행 (rRuntime·workspace 소관)

## Dependencies

- `../../types/enums`, `../../types/rExecution`, `../../utils/isoNow`
