## Purpose

r-statistics의 MCP host 경계를 소유한다. 도구 등록·전송·응답을 조립하고 실행 안전과 통계 판정은 각각의 소유자에게 위임한다.

## Conventions

- 모든 `registerTool` 콜백은 `wrapHandler` 로 감쌈
- 도구 등록명 snake_case, 심볼·파일 camelCase
- stdio transport 만 — stdout 직접 쓰기 금지(stderr 로그만)

## Boundaries

### Always do

- 서버 이름을 `'tools'` 로 고정
- `registerTool` 콜백을 `wrapHandler` 로 감싸기

### Ask first

- 새 도구 추가/이름 변경

### Never do

- 핸들러에서 `process.exit` 직접 호출(serverEntry 제외)
- 통계 정책·도메인 어휘를 실행 레이어에 도입
