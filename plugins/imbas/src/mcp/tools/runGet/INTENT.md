# runGet

## Purpose

실행 상태 조회 도구 핸들러.

## Conventions

인자 생략은 최신 실행 조회를 위한 정상 경로다. 실행 부재는 목록 조회와 달리 오류로 다룬다.

## Boundaries

### Always do

- 비즈니스 로직은 core/ 모듈에 위임

### Ask first

- inputSchema 변경

### Never do

- 핸들러에 비즈니스 로직 직접 구현
