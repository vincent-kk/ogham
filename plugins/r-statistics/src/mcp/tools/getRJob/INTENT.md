## Purpose

`get_r_job` 도구 핸들러. 비동기 R 잡의 상태와 결과를 읽기 전용으로 조회하고 실행 때 확정한 관리형 library 경로를 유지한다.

## Conventions

- 미존재 jobId → `JOB_NOT_FOUND` throw
- `includeStdout` 기본 true; false 면 stdout/stderr 텍스트 비움(인코딩만 유지)
- 결과 유무와 관계없이 `managedLibraryPath` 유지

## Boundaries

### Always do

- jobStore 의 현재 상태를 그대로 반영
- run_r와 같은 관리형 library 경로 반환

### Ask first

- 결과 페이로드 형태 변경

### Never do

- 잡 상태 전이·취소 (cancel_r_job 소관)
- 새 실행 트리거
