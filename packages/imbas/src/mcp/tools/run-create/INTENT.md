# run-create

## Purpose
파이프라인 실행 생성 도구 핸들러.

## Boundaries
### Always do
- 비즈니스 로직은 core/ 모듈에 위임
### Ask first
- inputSchema 변경
### Never do
- 핸들러에 비즈니스 로직 직접 구현
