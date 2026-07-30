# mcp — Contract

## Requirements

- **이 계층은 도메인 지식을 갖지 않는다.** `(method, path, params, body)` 튜플을 실행할 뿐이며, 어떤 이슈 필드가 무엇을 뜻하는지 알지 않는다. Cloud/Server 차이는 스킬과 이 계층이 흡수하고 그 아래로 내리지 않는다.
- 도구는 넷이다: `fetch`(HTTP), `convert`(로컬 변환), `auth_check`(인증 상태), `setup`(설정 UI).
- 모든 핸들러는 `shared/wrapHandler` 를 거친다.
- 외부 HTTP 는 `core/httpClient` 만 수행한다 — 핸들러가 `fetch` 를 직접 부르지 않는다.
- 자격증명은 도구 응답에 노출하지 않는다.
- stdout 은 stdio transport 전용이다.

## API Contracts

- `server/` — 서버 생성과 도구 4개 등록, stdio 연결.
- `serverEntry/` — `bridge/mcp-server.cjs` 번들 진입점.
- `tools/` — 도구 핸들러 4종.
- `shared/` — 응답 포맷과 `FetchContext` 조립.
- `pages/` — 브라우저 UI 정적 자산.

## Acceptance Criteria

### AC-domain-agnostic — 도메인 무지

- `mcp/` 안에 Jira·Confluence 도메인 규칙(필드 의미, 워크플로 지식)이 없다.

### AC-handler-wrapping — 핸들러 래핑

- 등록 도구가 4개이고 각 핸들러가 `wrapHandler` 를 거친다.

### AC-http-single-path — HTTP 단일 경로

- `mcp/` 안에 `fetch` 직접 호출이 없다.

## Last Updated

2026-07-30 — MCP 계층의 도메인 무지 계약을 문서화했다.
