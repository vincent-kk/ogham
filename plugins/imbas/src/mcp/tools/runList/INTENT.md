# runList

## Purpose

실행 목록 조회 도구 핸들러.

## Conventions

한 실행의 손상 때문에 목록 전체를 숨기지 않는다. BLOCKED 완료를 정상 완료로 오독하게 하지 않는다.

## Boundaries

### Always do

- 비즈니스 로직은 core/ 모듈에 위임

### Ask first

- inputSchema 변경

### Never do

- 핸들러에 비즈니스 로직 직접 구현
