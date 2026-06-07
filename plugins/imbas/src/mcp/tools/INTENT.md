# tools

## Purpose

MCP 도구 핸들러 모음. 각 핸들러는 core/ast 모듈에 위임하는 thin wrapper.

## Structure

16개 도구 핸들러 (imbasPing 포함):
- Pipeline: runCreate, runGet, runTransition, runList
- Manifest: manifestGet, manifestSave, manifestValidate, manifestPlan, manifestImplementPlan
- Config/Cache: configGet, configSet, cacheGet, cacheSet
- AST: astSearch, astAnalyze
- Utility: imbasPing

## Boundaries

### Always do

- 핸들러는 단일 async 함수로 export
- 비즈니스 로직은 core/ 모듈에 위임

### Ask first

- 새 도구 핸들러 추가 시 server.ts 등록도 동시 수행

### Never do

- 핸들러에 비즈니스 로직 직접 구현
- toolResult/toolError 직접 호출 (wrapHandler가 처리)
