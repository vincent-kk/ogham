# fetch — Contract

## Requirements

- HTTP 다섯 메서드(GET·POST·PUT·PATCH·DELETE)를 한 도구로 처리한다. 도메인 지식 없이 `(method, path, params, body)` 를 실행한다.
- 요청 본문의 Markdown 은 대상 포맷으로 자동 변환한다 — Cloud 는 ADF, Confluence Storage 는 XHTML, Jira Server 는 Wiki Markup 이다. 변환은 `converter/` 에 위임한다.
- 응답의 ADF 는 Markdown 으로 자동 변환해 돌려준다 — 호출자가 ADF 트리를 해석하지 않게 한다.
- 바이너리 에셋은 본문 대신 다운로드 경로로 다룬다.
- 전송은 `core/httpClient` 에 위임한다. 이 핸들러가 직접 `fetch` 를 부르지 않는다.
- 결과는 표준 `McpResponse` 봉투로 반환한다.

## API Contracts

- `handleFetch(...)` — 메서드·엔드포인트·파라미터·본문을 받아 실행하고 변환된 결과를 돌려준다.

## Acceptance Criteria

### AC-method-coverage — 메서드 커버리지

- 다섯 메서드가 모두 같은 경로로 처리되고 봉투 형태가 동일하다.

### AC-body-conversion — 본문 변환

- Markdown 본문이 대상 환경에 맞는 포맷(ADF·Storage XHTML·Wiki)으로 변환되어 전송된다.

### AC-response-conversion — 응답 변환

- 응답에 담긴 ADF 가 Markdown 으로 변환되어 반환된다.

### AC-transport-delegation — 전송 위임

- 이 fractal 에 `fetch` 직접 호출이 없다.

## Last Updated

2026-07-30 — 통합 HTTP 도구의 변환·위임 계약을 문서화했다.
