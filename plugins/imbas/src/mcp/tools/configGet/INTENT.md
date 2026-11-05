# configGet

## Purpose

설정값 조회 도구 핸들러.

## Conventions

조회는 병합된 유효 설정을 뜻한다. 계층 파일이 없는 첫 실행도 정상 상태다.

## Boundaries

### Always do

- 도메인 판단은 core에 위임한다. 핸들러는 전송 입력 해독·공유 스키마 검증·저장을 조립하되 도메인 규칙의 소유자가 되지 않는다.

### Ask first

- inputSchema 변경

### Never do

- 상태 전이·요약 계산·실행 경로 정책을 핸들러에서 재구현 — 도구별로 도메인 판단이 갈라지는 것을 막는다.
