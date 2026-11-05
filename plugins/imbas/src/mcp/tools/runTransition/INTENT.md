# runTransition

## Purpose

실행 상태 전이 도구 핸들러.

## Conventions

MCP의 평면 스키마와 action별 스키마를 분리해 JSON Schema의 $ref 생성을 피한다. project_root는 두 스키마에 모두 선언해야 strip되지 않는다.

## Boundaries

### Always do

- 비즈니스 로직은 core/ 모듈에 위임
- MCP inputSchema는 flat z.object + leaf primitive만 사용하고, handler에서 RunTransitionSchema.parse()로 분기 검증

### Ask first

- inputSchema 변경

### Never do

- 핸들러에 비즈니스 로직 직접 구현
