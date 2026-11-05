# manifestSave

## Purpose

매니페스트 저장 도구 핸들러.

## Conventions

전체 교체이므로 호출자가 완결된 문서를 넘긴다. 전송 클라이언트의 문자열 인코딩을 검증 전에 해독한다.

## Boundaries

### Always do

- 비즈니스 로직은 core/ 모듈에 위임

### Ask first

- inputSchema 변경

### Never do

- 핸들러에 비즈니스 로직 직접 구현
