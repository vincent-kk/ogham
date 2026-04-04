# ast-search

## Purpose
AST 패턴 검색 도구 핸들러. ast-grep-shared를 통해 코드 검색.

## Boundaries
### Always do
- 비즈니스 로직은 core/ 모듈에 위임
### Ask first
- inputSchema 변경
### Never do
- 핸들러에 비즈니스 로직 직접 구현
