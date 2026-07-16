# mcp — DETAIL

## Requirements

- MCP 서버 이름 `tools`, stdio transport. 도구 4개 등록.
- 모든 핸들러는 `wrapHandler` 로 감싸 throw 흡수 + `extra`(signal) 전달.
- 장수 HTTP 서버를 호스팅하되, 무거운 렌더러는 `bridge/assets/` 자산으로만 서빙(번들 미포함).

## Tools

| Tool               | Input                                                   | Output                                                       |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------------ |
| `render_viewer`    | `content`/`path`, `title?`, `options?`, `project_root?` | `{ session_id, url, status: "serving" }` (논블로킹)          |
| `collect_feedback` | `session_id`, `wait_seconds?`, `project_root?`          | content(text+image) 또는 `{ status:"pending", draft_count }` |
| `close_viewer`     | `session_id`, `project_root?`                           | `{ status: "closed" }`                                       |
| `open_settings`    | `project_root?`                                         | `{ url }`                                                    |

- `render_viewer`: content/path 정확히 하나(아니면 `invalid_input`), `max_viewer_mb` 캡(`read_error`). 상대 `path` 는 워크스페이스 기준 해석, 절대 `path` 는 그대로.
- `collect_feedback`: bounded long-poll, `wait_seconds ≤ 600`(기본 600 — 리뷰 1회를 한 호출로 덮는다; 상한 근거는 stdio idle window 30분). `unknown`/`closed` 세션은 throw. `extra.signal` abort 시 정리.
- `project_root`(절대경로)는 모든 도구에서 선택 — Claude 는 생략(`process.cwd()`), 플러그인 설치 디렉터리에서 기동되는 호스트는 필수(부재 시 actionable throw). 핸들러는 `ensureHttpServer` 보다 먼저 해석해 세션 해시와 서버 스코프를 일치시킨다.
- 도구 등록명은 snake_case, 심볼·파일은 camelCase.

## HTTP routes

[httpServer/DETAIL.md](./httpServer/DETAIL.md) 참조. token 보호(+`/assets` 면제), CSRF(json/multipart), 127.0.0.1 전용, idle 종료.

## Build outputs

- `bridge/mcp-server.cjs` — esbuild(node, cjs). mermaid/katex/highlight 미포함(가드 강제).
- `bridge/viewer.html`, `bridge/settings.html` — esbuild inline(런타임 로드).
- `bridge/assets/{highlight,mermaid,katex}.js` + `katex.css` + woff2 — lazy 렌더러 자산.

## Acceptance

- 4개 도구가 등록되고 envelope 가 일관된다.
- `mcp-server.cjs` 에 무거운 렌더러가 번들되지 않는다(빌드 가드).
- 뷰어 HTML 이 `__DEILEN_STATE__` 주입과 함께 서빙된다.
