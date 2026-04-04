# tools

## Purpose

MCP 도구 핸들러 모음. 각 핸들러는 core/ast 모듈에 위임하는 thin wrapper.

## Structure

15개 ��구 핸들러 + imbas-ping:
- Pipeline: run-create, run-get, run-transition, run-list
- Manifest: manifest-get, manifest-save, manifest-validate, manifest-plan
- Config/Cache: config-get, config-set, cache-get, cache-set
- AST: ast-search, ast-analyze
- Utility: imbas-ping

## Boundaries

### Always do

- 핸들러는 단일 async 함수로 export
- 비즈니스 로직은 core/ 모듈에 위임

### Ask first

- 새 도구 핸들러 추가 시 server.ts 등록도 동시 수행

### Never do

- 핸들러에 비즈니스 로직 직접 구현
- toolResult/toolError 직접 호출 (wrapHandler가 처리)
