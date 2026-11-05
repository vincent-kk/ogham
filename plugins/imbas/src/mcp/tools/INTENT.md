# tools

## Purpose

MCP 도구 핸들러 모음. 전송 입력 해독·공유 스키마 검증·저장을 조립하며 도메인 판단은 core 모듈이 소유한다.

## Conventions

9개 도구 전부(run\*, manifest\*, config\*, open_settings)가 선택 인자 `project_root`(절대경로)를 받아 `projectRoot()` 로 워크스페이스를 해석한다. Claude Code 에서는 생략 — 서버가 워크스페이스에서 실행되므로 `process.cwd()` 와 동일하다. 플러그인 설치 디렉토리에서 서버를 띄우는 호스트에서는 필수이며, 없으면 해석 실패로 throw 한다.

## Boundaries

### Always do

- 핸들러는 단일 async 함수로 export
- 도메인 판단은 core에 위임한다. 핸들러는 전송 입력 해독·공유 스키마 검증·저장을 조립하되 도메인 규칙의 소유자가 되지 않는다.
- 프로젝트 경로는 `process.cwd()` 직접 호출 대신 `projectRoot(input.project_root)` 로 해석

### Ask first

- 새 도구 핸들러 추가 시 server.ts 등록도 동시 수행

### Never do

- 상태 전이·요약 계산·실행 경로 정책을 핸들러에서 재구현 — 도구별로 도메인 판단이 갈라지는 것을 막는다.
- toolResult/toolError 직접 호출 (wrapHandler가 처리)
