# configGet

## Purpose

설정값 조회 도구 핸들러.

## Conventions

조회는 병합된 유효 설정을 뜻한다. 계층 파일이 없는 첫 실행도 정상 상태다.

## Boundaries

### Always do

- 비즈니스 로직은 core/ 모듈에 위임

### Ask first

- inputSchema 변경

### Never do

- 핸들러에 비즈니스 로직 직접 구현
