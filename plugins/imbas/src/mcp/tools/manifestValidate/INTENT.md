# manifestValidate

## Purpose

매니페스트 검증 도구 핸들러.

## Conventions

파일 부재는 검증할 대상이 없다는 결과다. 검증 규칙과 결과 해석을 핸들러에서 다시 정의하지 않는다.

## Boundaries

### Always do

- 비즈니스 로직은 core/ 모듈에 위임

### Ask first

- inputSchema 변경

### Never do

- 핸들러에 비즈니스 로직 직접 구현
