# mcp — MCP 서버·도구 경계

## Purpose

MCP 서버, 범용 HTTP/유틸리티 도구 4종, 그리고 승인된 도메인 어댑터(현재 `jira_comment_thread`)를 소유한다. 범용 도구는 도메인 지식 없이 (method, path, params, body) 튜플을 실행할 뿐이고, 어댑터만 도메인 계층의 진입점을 부를 자격을 갖는다.

## Conventions

- 모든 도구 핸들러는 `wrapHandler` 로 감싸 표준 에러 처리를 보장한다.
- 도구 응답은 `toolResult` / `toolError` 헬퍼로만 생성한다.
- Zod 스키마로 입력을 검증한 뒤 core 계층에 위임한다.
- 도메인 어댑터는 도구 계층 안에 살지 이 노드 직속이 아니다 — 등록 경로는 범용 도구와 같고, 도메인 호출만 추가로 허용된다.

## Boundaries

### Always do

- `server.registerTool()` 과 Zod 스키마로 도구 등록
- HTTP 도구는 표준 `McpResponse` 봉투로 반환

### Ask first

- 새 MCP 도구 추가

### Never do

- 도메인 규칙(Jira/Confluence 필드 의미, 병합 로직)을 범용 도구나 서버·공유 계층에 넣지 않는다 — 어댑터는 도메인 계층의 진입점만 호출한다
- 인증 토큰을 도구 응답에 노출
