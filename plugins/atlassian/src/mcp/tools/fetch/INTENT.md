# fetch — HTTP 도구 핸들러

## Purpose

HTTP GET/POST/PUT/PATCH/DELETE 를 통합 처리하는 MCP 도구 핸들러. ADF 자동 변환, 응답 본문 파일 저장, Markdown → wire 포맷 변환을 조율하며 전송 자체는 소유하지 않는다.

## Conventions

- 유틸은 이 핸들러 전용이다 — 조율은 여기서 하고 각 단계는 한 단계씩 아래로 내려간다.
- 요청 body 는 harness 가 문자열로 직렬화해 보낼 수 있으므로, 변환 전에 반드시 정규화 단계를 거친다.
- endpoint 는 절대 URL 로 도착할 수 있다. base 상대로 축약 → 논리→물리 변환 → prefix 부착 순서를 지켜야 하며, 순서가 바뀌면 DC 경로가 깨진다.
- 저장 경로는 요청 값 그대로 쓰지 않고 allow-root 기준으로 재해석한다.

## Boundaries

### Always do

- 원시 `body` 는 정규화한 뒤 변환·전송한다
- HTTP 전송은 `core/httpClient` 의 `executeRequest` 에 위임한다
- GET + `save_to_path` 조합은 `expand`·`accept_format` 을 그대로 넘겨 저장 유틸로 라우팅하며, 진입 시 선택 인자 `project_root` 를 저장 경로 allow-root 좌표로 시드한다
- GET 응답의 ADF 필드는 Markdown 으로 자동 변환한다
- 절대 URL endpoint 는 base 상대로 축약 → 논리→물리 변환 → prefix 부착 순으로 처리한다
- DC(`ctx.requires_xsrf_bypass`) non-GET 요청에는 `X-Atlassian-Token: no-check` 헤더를 주입한다

### Ask first

- 새 HTTP 메서드 지원 추가
- 유틸 파일 추가 또는 제거
- save_to_path 저장 포맷(pretty JSON·바이트 그대로) 변경

### Never do

- HTTP 요청을 `executeRequest` 없이 직접 수행하지 않는다
- Jira / Confluence 도메인 비즈니스 로직(이슈 필드 해석 등)을 포함하지 않는다
- 이 모듈의 유틸을 외부에서 직접 import 하지 않는다
