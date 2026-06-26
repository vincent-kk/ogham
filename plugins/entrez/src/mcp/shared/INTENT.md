## Purpose

MCP 계층 공유 유틸: 응답 포맷 표준화(toolResult/toolError/wrapHandler)와 도구 실행 컨텍스트 조립(buildToolContext — config·credentials 로드 + HttpDeps DI).

## Structure

| 파일 | 역할 |
| --- | --- |
| `helpers/toolResult.ts` | `toolResult`·`mapReplacer` |
| `helpers/toolError.ts` | `toolError` |
| `helpers/wrapHandler.ts` | `wrapHandler` — try/catch + 포맷 |
| `helpers/buildContext.ts` | `buildToolContext`·`ToolContext` |

## Conventions

- 모든 도구 응답은 `toolResult`/`toolError` 형식. 핸들러는 `wrapHandler`로 래핑.
- SSRF allowlist는 `[host(base_url), NCBI_SERVICE_HOST]`로 도출.

## Boundaries

### Always do

- 미설정 시 `Messages.NOT_CONFIGURED` throw. api_key는 deps 주입만(노출 금지).

### Ask first

- 응답 스키마 구조 변경, 새 공유 헬퍼 추가.

### Never do

- 도메인 로직(검색·다운로드) 구현. api_key 값을 응답·로그에 노출.

## Dependencies

- `../../core/config` — `loadConfig`/`loadCredentials`
- `../../utils/url` — `extractHost`
- `../../types/{http,config,enums}` · `../../constants/{defaults,messages}`
