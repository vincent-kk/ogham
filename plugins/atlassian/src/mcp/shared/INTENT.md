# shared — MCP 계층 공유 유틸리티

## Purpose

MCP 도구 응답 포맷 표준화와 fetch 컨텍스트 조립을 소유한다. 성공·오류 봉투 생성, 핸들러 래핑, 서비스 컨텍스트 조립이 여기 모이며 도구별 로직은 갖지 않는다.

## Conventions

- 모든 MCP 응답은 이 계층의 헬퍼를 거쳐 만들어진다 — 도구가 봉투를 손으로 조립하지 않는다.
- `Map` / `Set` 은 JSON 이 직렬화하지 못하므로 전용 replacer 를 통과시킨다.
- 컨텍스트 조립은 이 계층이 설정·인증을 읽는 유일한 지점이고, 그 밖의 I/O 는 갖지 않는다.

## Boundaries

### Always do

- 모든 MCP 응답을 `toolResult` / `toolError` 형식으로 반환한다
- `wrapHandler` 로 툴 핸들러의 try/catch 를 일관되게 처리한다
- `Map` / `Set` 직렬화는 `mapReplacer` 를 통해 수행한다
- fetch 호출 전 `buildFetchContext` 로 서비스 컨텍스트를 조립한다

### Ask first

- MCP 응답 스키마 구조 변경 (`content` 배열, `isError` 필드 등)
- 새 공유 유틸리티 함수 추가 (범위 확장 여부 확인)

### Never do

- Jira / Confluence 도메인 비즈니스 로직(이슈 필드 해석 등)을 포함하지 않는다
- HTTP 요청 또는 외부 I/O 를 직접 수행하지 않는다 (컨텍스트 조립 시 설정 로드는 예외)
- 도구 핸들러를 직접 import 하지 않는다
