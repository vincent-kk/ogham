## Purpose

MCP 서버 인스턴스 생성 및 도구 등록·라우팅. stdio 트랜스포트로 Claude Code와 통신한다.

## Structure

| 파일                        | 역할                                 |
| --------------------------- | ------------------------------------ |
| `lifecycle/createServer.ts` | `createServer` — 서버 생성·도구 등록 |
| `lifecycle/startServer.ts`  | `startServer` — stdio 연결           |
| `index.ts`                  | 배럴 export                          |

## Conventions

- `server.registerTool()` + zod 스키마로 도구 등록.
- 도구 핸들러는 `shared/wrapHandler`로 래핑.
- 서버 이름·버전은 상수/`version.ts`에서 가져온다.

## Boundaries

### Always do

- 새 도구는 `createServer`에서 등록하고 핸들러는 `tools/`에 둔다.
- 등록 시 `annotations`(readOnly·idempotent·destructive)를 정확히 표기.

### Ask first

- 트랜스포트 방식 변경(stdio 외 HTTP 등).

### Never do

- 도메인 로직을 이 모듈에 직접 구현(도구 핸들러·core 소관).
- core 외 레이어를 건너뛰어 외부 API 직접 호출.

## Dependencies

- `@modelcontextprotocol/sdk` — `McpServer`·`StdioServerTransport`
- `../../version.js` — `VERSION`
- `../shared` — `wrapHandler` (Phase 5+)
- `../tools/*` — 도구 핸들러 (Phase 5+)
