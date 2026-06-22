## Purpose

deilen 의 MCP 서버(stdio) fractal. 도구 등록·실행, 장수 HTTP 서버 호스팅, 뷰어 FE 서빙을 담당한다. 서버 이름은 `tools` (`.mcp.json` 과 일치).

## Structure

| Path           | Role                                                            |
| -------------- | --------------------------------------------------------------- |
| `server/`      | createServer(도구 등록) + startServer(stdio) + shutdown (organ) |
| `serverEntry/` | esbuild 진입점 → `bridge/mcp-server.cjs` (organ)                |
| `shared/`      | toolResult·toolError·wrapHandler(extra 전달) (organ)            |
| `tools/`       | `renderReport` 외 도구 organ 들                                 |
| `httpServer/`  | 127.0.0.1 단일 서버 (fractal)                                   |
| `pages/`       | 뷰어·설정 FE (organ — 빌드 입력)                                |
| `index.ts`     | barrel                                                          |

## Conventions

- 모든 `registerTool` 콜백은 `wrapHandler` 로 감쌈 (throw 흡수 + extra 전달)
- 도구 등록명은 snake_case(`render_report`), 심볼·파일은 camelCase
- stdio transport 만 — stdout 직접 쓰기 금지(stderr 로그만)
- 무거운 렌더러는 `bridge/assets/` (브라우저 자산) — 서버 코드 import 금지

## Boundaries

### Always do

- 서버 이름을 `'tools'` 로 고정
- `registerTool` 콜백을 `wrapHandler` 로 감싸기

### Ask first

- 새 도구 추가/이름 변경
- HTTP 서버 lifecycle 정책 변경

### Never do

- 핸들러에서 `process.exit` 직접 호출(serverEntry 제외)
- `mcp-server.cjs` 번들에 mermaid/katex/highlight 포함

## Dependencies

- `@modelcontextprotocol/sdk`, `zod`
- `../core`, `../render`, `../types`, `../version`
