## Purpose

MCP 서버 인스턴스 생성 및 3개 도구(fetch, convert, auth-check, setup) 등록·라우팅.
stdio 트랜스포트로 Claude Code와 통신한다.

## Structure

| 파일 | 역할 |
|---|---|
| `server.ts` | `createServer` — 도구 등록, `startServer` — stdio 연결 |
| `index.ts` | barrel export |

## Boundaries

### Always do

- `server.registerTool()`과 Zod 스키마로 도구 등록
- 도구 핸들러는 `wrapHandler`로 래핑하여 표준 에러 처리 보장
- 서비스 감지(`detectService`)로 Jira/Confluence 분기 후 core 위임

### Ask first

- 새 MCP 도구 추가 (mcp/INTENT.md의 "Ask first" 정책 적용)
- 트랜스포트 방식 변경 (stdio 외 HTTP 등)

### Never do

- Jira·Confluence 도메인 지식을 이 모듈에 직접 구현
- 인증 토큰을 도구 응답에 노출
- core/ 이외의 레이어를 건너뛰어 외부 API 직접 호출

## Dependencies

- `@modelcontextprotocol/sdk` — `McpServer`, `StdioServerTransport`
- `../../core/config-manager` — 설정 로드
- `../../core/auth-manager` — 인증 헤더 생성
- `../../utils` — `detectService`
- `../shared` — `wrapHandler`
- `../tools/{fetch,convert,setup,auth-check}` — 도구 핸들러
