## Purpose

`cancel_r_job` 도구 핸들러. 실행 중 R 잡을 AbortController 로 SIGKILL 종료하고 상태를 Cancelled 로 전이한다. idempotent.

## Conventions

- 취소는 jobStore에 위임한다. 프로세스 제어를 이 도구에서 중복 구현하면 잡 상태와 실제 종료가 어긋날 수 있다.
- 종료된 잡의 반복 취소는 오류가 아니라 상태로 답한다. 클라이언트가 재시도해도 안전해야 한다.

## Boundaries

### Always do

- 취소 시 spawn 자식에 SIGKILL 전파

### Ask first

- 취소 정책(종료 상태 처리) 변경

### Never do

- 결과 조회·재실행 (get_r_job / run_r 소관)
