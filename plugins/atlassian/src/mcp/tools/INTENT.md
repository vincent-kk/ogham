# tools — MCP 도구 핸들러 모음

## Purpose

범용 MCP 도구 핸들러 4종(HTTP fetch, 포맷 convert, 인증 확인, 인증 설정)과 승인된 도메인 어댑터를 소유한다. 범용 도구는 도메인 지식을 갖지 않고, 어댑터만 도메인 계층을 호출할 자격을 갖는다.

## Conventions

- 도구 하나가 독립 자식 fractal 이며 배럴로만 노출된다.
- 핸들러 함수명은 `handle{ToolName}` 패턴을 따른다.
- 어댑터는 얇다 — 입력 분기와 위임만 하고 병합·판정 로직을 보유하지 않는다.

## Boundaries

### Always do

- HTTP 도구는 전송을 httpClient 에 위임한다
- HTTP 도구는 표준 `McpResponse` 봉투로 반환한다

### Ask first

- 새 도구 추가

### Never do

- 범용 도구 핸들러에 Jira/Confluence 도메인 규칙을 심지 않는다
- 어댑터는 도메인 계층의 진입점만 부르고 그 내부 파일을 import 하지 않는다
