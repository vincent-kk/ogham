## Purpose

비동기 R 잡 인메모리 레지스트리. 장수 MCP 서버 프로세스 동안 잡의 생명주기(queued→running→succeeded/failed/timeout/cancelled)와 AbortController·결과를 추적한다. `run_r`·`get_r_job`·`cancel_r_job` 세 도구가 공유한다.

## Conventions

- 잡은 프로세스 수명의 휘발성 상태이며 디스크 워크스페이스 산출물과 구분한다. 영속 상태를 도입하면 재시작 후 취소·결과 소유권이 달라진다.
- 취소 결과는 종료된 잡과 미등록 잡을 구분한다. 재호출을 실행 실패로 오해하지 않게 한다.

## Boundaries

### Always do

- 취소 시 `AbortController.abort()` 로 spawn 종료 신호 전파
- 미존재 잡 업데이트는 no-op

### Ask first

- 잡 상태를 디스크에 영속화하는 방향 전환

### Never do

- 잡 레지스트리에 통계 결과 해석·정책 저장
- spawn·아티팩트 수집 직접 수행 (rRuntime·workspace 소관)
