[filid:lang:ko]

# jira — Jira 도메인 레시피 계층

## Purpose

요청 여러 개를 결정적으로 조합해야 하는 Jira 도메인 규칙을 소유한다. 범용 MCP 도구 4종이 도메인 무지를 유지할 수 있도록, 도메인 지식은 이 fractal 아래에만 둔다.

## Conventions

- 자식 fractal 하나가 레시피 하나이며 배럴로만 노출한다.
- 레시피 **내부**는 효과 경계로 갈린다 — 순수 함수, 원격 요청, 파일 I/O 가 각각 별도 organ 에 산다. 이 organ 들은 레시피 안에 있지 이 노드 직속이 아니다.
- HTTP 는 주입된 요청 함수만 쓴다. 운영 기본값은 `core/httpClient` 의 `executeRequest` 이고, 검증은 가짜 요청 함수를 주입해 수행한다.

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
