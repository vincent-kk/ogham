## Purpose

MCP 툴 응답 포맷 표준화 + fetch 컨텍스트 빌더 등 MCP 계층 공유 유틸리티.
성공/오류 응답 생성, 핸들러 래핑, FetchContext 조립 함수를 제공한다.

## Structure

| 파일 | 역할 |
|------|------|
| `tool-response.ts` | `toolResult`, `toolError`, `mapReplacer`, `wrapHandler` 구현 |
| `build-fetch-context.ts` | `buildFetchContext` — 서비스+사이트+인증 헤더+API버전을 합쳐 FetchContext 생성 |
| `index.ts` | 배럴 — 위 5개 함수 재내보내기 |

## Boundaries

### Always do

- 모든 MCP 응답을 `toolResult` / `toolError` 형식으로 반환한다
- `wrapHandler`로 툴 핸들러의 try/catch를 일관되게 처리한다
- `Map` / `Set` 직렬화는 `mapReplacer`를 통해 수행한다
- fetch 호출 전 `buildFetchContext`로 서비스 컨텍스트를 조립한다

### Ask first

- MCP 응답 스키마 구조 변경 (`content` 배열, `isError` 필드 등)
- 새 공유 유틸리티 함수 추가 (범위 확장 여부 확인)

### Never do

- Jira / Confluence 도메인 비즈니스 로직(이슈 필드 해석 등)을 포함하지 않는다
- HTTP 요청 또는 외부 I/O를 직접 수행하지 않는다 (`buildFetchContext` 의 config 로드는 예외)
- `mcp/tools` 하위 핸들러를 직접 import하지 않는다

## Dependencies

- `../../core/config-manager` — `loadConfig` (build-fetch-context)
- `../../core/auth-manager` — `getAuthHeader` (build-fetch-context)
- `../../utils` — `resolveSiteConfig` (build-fetch-context)
- `../../types` — `FetchContext`, `HttpClientConfig`
