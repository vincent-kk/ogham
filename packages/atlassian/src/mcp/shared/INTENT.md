## Purpose

MCP 툴 응답 포맷을 표준화하는 공유 유틸리티 모듈.
성공/오류 응답 생성 및 핸들러 래핑 함수를 제공한다.

## Structure

| 파일 | 역할 |
|------|------|
| `tool-response.ts` | `toolResult`, `toolError`, `mapReplacer`, `wrapHandler` 구현 |
| `index.ts` | 배럴 — 위 4개 함수 재내보내기 |

## Boundaries

### Always do

- 모든 MCP 응답을 `toolResult` / `toolError` 형식으로 반환한다
- `wrapHandler`로 툴 핸들러의 try/catch를 일관되게 처리한다
- `Map` / `Set` 직렬화는 `mapReplacer`를 통해 수행한다

### Ask first

- MCP 응답 스키마 구조 변경 (`content` 배열, `isError` 필드 등)
- 새 공유 유틸리티 함수 추가 (범위 확장 여부 확인)

### Never do

- Jira / Confluence 도메인 로직을 이 모듈에 포함하지 않는다
- HTTP 요청 또는 외부 I/O를 직접 수행하지 않는다
- `mcp/tools` 하위 핸들러를 직접 import하지 않는다

## Dependencies

- 외부 의존 없음 (Node.js 내장 `JSON.stringify`만 사용)
