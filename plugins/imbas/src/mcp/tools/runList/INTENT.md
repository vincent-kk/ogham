# runList

## Purpose

실행 목록 조회 도구 핸들러.

## Conventions

한 실행의 손상 때문에 목록 전체를 숨기지 않는다. BLOCKED 완료를 정상 완료로 오독하게 하지 않는다.

## Boundaries

### Always do

- 도메인 판단은 core에 위임한다. 핸들러는 전송 입력 해독·공유 스키마 검증·저장을 조립하되 도메인 규칙의 소유자가 되지 않는다.

### Ask first

- inputSchema 변경

### Never do

- 상태 전이·요약 계산·실행 경로 정책을 핸들러에서 재구현 — 도구별로 도메인 판단이 갈라지는 것을 막는다.
