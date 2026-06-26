## Purpose

`get_r_job` 도구 핸들러. 비동기 R 잡의 상태와(종료 시) 결과를 jobStore 에서 조회한다. 읽기 전용·idempotent.

## Structure

| File         | Role                                                       |
| ------------ | ---------------------------------------------------------- |
| `getRJob.ts` | 핸들러 — jobStore 조회, includeStdout=false 시 스트림 제거 |
| `index.ts`   | barrel                                                     |

## Conventions

- 미존재 jobId → `JOB_NOT_FOUND` throw
- `includeStdout` 기본 true; false 면 stdout/stderr 텍스트 비움(인코딩만 유지)

## Boundaries

### Always do

- jobStore 의 현재 상태를 그대로 반영

### Ask first

- 결과 페이로드 형태 변경

### Never do

- 잡 상태 전이·취소 (cancel_r_job 소관)
- 새 실행 트리거

## Dependencies

- `../../../core` (jobStore), `../../../constants/messages`, `../../../types/rExecution`
