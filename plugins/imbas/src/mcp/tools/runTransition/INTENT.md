# runTransition

## Purpose

실행 상태 전이 도구 핸들러.

## Conventions

MCP의 평면 스키마와 action별 스키마를 분리해 JSON Schema의 $ref 생성을 피한다. project_root는 두 스키마에 모두 선언해야 strip되지 않는다.

## Boundaries

### Always do

- 도메인 판단은 core에 위임한다. 핸들러는 전송 입력 해독·공유 스키마 검증·저장을 조립하되 도메인 규칙의 소유자가 되지 않는다.
- MCP inputSchema는 flat z.object + leaf primitive만 사용하고, handler에서 RunTransitionSchema.parse()로 분기 검증

### Ask first

- inputSchema 변경

### Never do

- 상태 전이·요약 계산·실행 경로 정책을 핸들러에서 재구현 — 도구별로 도메인 판단이 갈라지는 것을 막는다.
