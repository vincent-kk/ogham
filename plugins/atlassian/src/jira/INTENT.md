[filid:lang:ko]

## Purpose

Jira 도메인 레시피 계층. 요청 여러 개를 결정적으로 조합해야 하는 도메인 규칙(현재 `commentThread/` — reply 플러그인 댓글 스레드 복원)을 소유한다. 범용 MCP 도구 4종이 도메인 무지를 유지할 수 있도록, 도메인 지식은 이 fractal 아래에만 둔다.

## Conventions

- 자식 fractal 하나가 레시피 하나이며 `index.ts` 배럴로만 노출한다.
- HTTP 는 주입된 요청 함수(운영: `core/httpClient` 의 `executeRequest`)만 쓴다. 순수 함수는 `operations/`, 요청 함수는 `requests/`, 파일 I/O 는 `profile/` organ 에 둔다.

## Boundaries

### Always do

- 순수 함수는 프로필·시각·요청 함수를 **인자로** 받는다 — 모듈 상태를 읽지 않는다.
- 원격 응답을 근거로 로컬 파일을 자동 재작성하지 않는다.

### Ask first

- 새 레시피(자식 fractal) 추가
- 프로필 파일 스키마 버전 증가

### Never do

- `mcp/` 를 import 하지 않는다 (단방향: mcp → jira → core).
- `fetch` 를 직접 호출하지 않는다.
- 프로필 값으로 URL 의 host·path 를 구성하지 않는다 — property 키는 `encodeURIComponent` 를 거친 경로 세그먼트 하나뿐이다.
