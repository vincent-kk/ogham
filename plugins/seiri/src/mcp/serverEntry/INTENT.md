# serverEntry — MCP 서버 stdio 진입점

## Purpose

esbuild 가 `bridge/mcp-server.cjs` 로 번들하는 MCP 서버 stdio 진입점.
`server/startServer` 를 호출하고 부팅 실패를 stderr 로 보고한다.

## Boundaries

### Always do

- 변경 후 관련 테스트 업데이트

### Ask first

- 공개 API 시그니처 변경

### Never do

- 모듈 경계 외부 로직 인라인 — 서버 조립은 `server/` 소관
