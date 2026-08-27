# mcp — Contract

## Requirements

- **이 계층은 도메인 지식을 갖지 않는다.** `(method, path, params, body)` 튜플을 실행할 뿐이며, 어떤 이슈 필드가 무엇을 뜻하는지 알지 않는다. Cloud/Server 차이는 스킬과 이 계층이 흡수하고 그 아래로 내리지 않는다.
- 범용 도구는 4종이다: `fetch`(HTTP), `convert`(로컬 변환), `auth_check`(인증 상태), `setup`(설정 UI). 여기에 **승인된 도메인 어댑터**를 더할 수 있다 — 현재 `jira_comment_thread` 하나다.
- 도메인 어댑터는 입력 검증, 실행 컨텍스트 구성, 도메인 fractal의 공개 `jira` entry point 호출, 응답 래핑만 수행한다. 도메인 필드 해석, 원격 응답에 따른 레시피 선택, 병합 규칙, 프로필 수명주기는 포함하지 않는다 — 그것은 Jira 도메인 계층이 소유한다.
- 모든 핸들러는 `shared/wrapHandler` 를 거친다.
- 외부 HTTP 는 `core/httpClient` 만 수행한다 — 핸들러가 `fetch` 를 직접 부르지 않는다.
- 자격증명은 도구 응답에 노출하지 않는다.
- stdout 은 stdio transport 전용이다.

## API Contracts

- `server/` — 서버 생성과 도구 5개 등록, stdio 연결.
- `serverEntry/` — `bridge/mcp-server.cjs` 번들 진입점.
- `tools/` — 범용 도구 핸들러 4종과 도메인 어댑터 1종.
- `shared/` — 응답 포맷과 `FetchContext` 조립.
- `pages/` — 브라우저 UI 정적 자산.

## Acceptance Criteria

### AC-domain-agnostic — 도메인 무지

- 범용 도구 4종(`fetch`·`convert`·`authCheck`·`setup`)과 `shared/`·`server/` 안에 Jira·Confluence 도메인 규칙(필드 의미, 워크플로 지식)이 없다.
- 도메인 어댑터(`tools/jiraCommentThread/`)는 공개 `jira` entry point의 named export만 호출하며, 병합·판정 규칙을 담은 함수가 어댑터 안에 없다.

### AC-handler-wrapping — 핸들러 래핑

- 등록 도구가 5개이고 각 핸들러가 `wrapHandler` 를 거친다.

### AC-http-single-path — HTTP 단일 경로

- `mcp/` 안에 `fetch` 직접 호출이 없다.

## Last Updated

2026-08-28 — 승인된 도메인 어댑터가 공개 `jira` entry point만 소비하도록 경계를 정규화했다.
