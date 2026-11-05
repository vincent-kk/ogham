## Purpose

`get_r_job` 도구 핸들러. 비동기 R 잡의 상태와 결과를 읽기 전용으로 조회하고 실행 때 확정한 관리형 library 경로를 유지한다.

## Conventions

- 폴링은 jobStore의 현재 관측을 반환하며 실행·취소를 일으키지 않는다.
- 스트림 생략 옵션은 큰 출력의 반복 전송을 막기 위한 것이다. 결과가 없거나 스트림을 숨겨도 실행과 같은 관리형 library 경로는 유지한다.

## Boundaries

### Always do

- jobStore 의 현재 상태를 그대로 반영
- run_r와 같은 관리형 library 경로 반환

### Ask first

- 결과 페이로드 형태 변경

### Never do

- 잡 상태 전이·취소 (cancel_r_job 소관)
- 새 실행 트리거
