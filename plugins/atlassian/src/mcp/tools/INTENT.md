## Purpose

4 generic MCP tool handlers — fetch (HTTP GET/POST/PUT/PATCH/DELETE), convert (local format), auth_check (auth status), setup (auth config) — plus the approved domain adapter jiraCommentThread (Jira DC comment thread recovery).

## Structure

| Directory            | Role                                                            |
| -------------------- | --------------------------------------------------------------- |
| `fetch/`             | HTTP GET/POST/PUT/PATCH/DELETE 핸들러                           |
| `convert/`           | ADF/Storage ↔ Markdown 변환 핸들러                              |
| `setup/`             | 인증 설정 위저드 핸들러                                         |
| `authCheck/`         | 인증 상태 확인 핸들러                                           |
| `jiraCommentThread/` | Jira DC 댓글 스레드 어댑터 (read · scan · probe · save_profile) |

## Conventions

- 각 tool은 독립 sub-fractal로 분리, `index.ts` barrel 노출
- 핸들러 함수명은 `handle{ToolName}` 패턴

## Dependencies

- `mcp/shared/` — `wrapHandler`, `toolResult`, `toolError`
- `core/` — HTTP 실행, 인증, 설정
- `converter/` — 포맷 변환 (convert tool만)
- `jira/` — `readCommentThread`·`scanCommentThreads`·`probeCommentThread`·`saveCommentThreadProfile` (jiraCommentThread tool만)

## Boundaries

### Always do

- HTTP tools delegate to httpClient for transport
- Return standard McpResponse envelope from HTTP tools

### Ask first

- Add new tool

### Never do

- Embed Jira/Confluence domain rules in tool handlers — an adapter calls `src/jira/index.js` and nothing inside `src/jira/commentThread/`
