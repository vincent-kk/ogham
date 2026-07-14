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

## Conventions

프로젝트 대상 도구(run\*, manifest\*, config\*, cache\*, astSearch)는 선택 인자 `project_root`(절대경로)를 받아 `projectRoot()` 로 워크스페이스를 해석한다. Claude Code 에서는 생략 — 서버가 워크스페이스에서 실행되므로 `process.cwd()` 와 동일하다. 플러그인 설치 디렉토리에서 서버를 띄우는 호스트에서는 필수이며, 없으면 해석 실패로 throw 한다. imbasPing / astAnalyze 는 프로젝트를 건드리지 않아 대상이 아니다.

## Boundaries

### Always do

- 핸들러는 단일 async 함수로 export
- 비즈니스 로직은 core/ 모듈에 위임
- 프로젝트 경로는 `process.cwd()` 직접 호출 대신 `projectRoot(input.project_root)` 로 해석

### Ask first

- 새 도구 핸들러 추가 시 server.ts 등록도 동시 수행

### Never do

- 핸들러에 비즈니스 로직 직접 구현
- toolResult/toolError 직접 호출 (wrapHandler가 처리)
