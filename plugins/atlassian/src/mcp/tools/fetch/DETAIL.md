# fetch — Contract

## Requirements

- HTTP 다섯 메서드(GET·POST·PUT·PATCH·DELETE)를 한 도구로 처리한다. 도메인 지식 없이 `(method, path, params, body)` 를 실행한다.
- 요청 본문의 Markdown 은 대상 포맷으로 자동 변환한다 — Cloud 는 ADF, Confluence Storage 는 XHTML, Jira Server 는 Wiki Markup 이다. 변환은 `converter/` 에 위임한다.
- 응답의 ADF 는 Markdown 으로 자동 변환해 돌려준다 — 호출자가 ADF 트리를 해석하지 않게 한다.
- `save_to_path` 가 있는 GET 은 응답 본문을 봉투 대신 그 경로에 저장한다 — 바이너리는 바이트 그대로, JSON 은 인라인 GET 과 동일한 ADF 변환(`accept_format: "raw"` 면 생략)을 거친 pretty JSON 으로 쓴다. 매 호출이 네트워크를 타고 기존 파일을 덮어쓴다 — 사전 캐시 조회는 없다.
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

### AC-save-to-path — 응답 본문 저장

- 성공한 GET + `save_to_path` 는 항상 파일을 쓰고 `{ saved_to, size_bytes, content_type }` 을 돌려준다 — JSON 응답이라도 인라인 반환으로 빠지지 않는다.
- `save_to_path` 는 요청 값 그대로가 아니라 `projectRoot()` 가 정한 프로젝트 임시 루트 아래로 재해석된다. 호출자는 응답의 `saved_to` 를 그대로 쓰며, 요청에 넣은 경로를 다시 열지 않는다.
- `expand` 는 인라인 GET 과 동일하게 쿼리에 병합된다. 저장 경로는 `Accept: */*` 로 요청하므로 content negotiation 을 하는 엔드포인트에서는 본문이 인라인 GET 과 다를 수 있다.
- JSON 이 아닌 200 응답(예: HTML 로그인 페이지)은 바이트 그대로 쓰고 `content_type` 에 실제 헤더 값을 담는다. 호출자는 `content_type` 을 확인한다.
- 대상 경로에 파일이 이미 있어도 HTTP 요청이 발생하고 파일이 덮어써진다 — `cached` 필드와 `force` 인자는 계약에 없다.
- 실패한 요청은 오류 봉투를 그대로 돌려주고 파일을 쓰지 않는다.

## Last Updated

2026-08-28 — save_to_path의 런타임 프로젝트 임시 루트 소유권을 경로 인벤토리 없이 명확히 했다.
