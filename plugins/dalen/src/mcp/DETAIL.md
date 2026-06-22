# mcp — DETAIL

## Requirements

- MCP 서버 이름 `tools`, stdio transport. 도구 4개 등록.
- 모든 핸들러는 `wrapHandler` 로 감싸 throw 흡수 + `extra`(signal) 전달.
- 장수 HTTP 서버를 호스팅하되, 무거운 렌더러는 `bridge/assets/` 자산으로만 서빙(번들 미포함).

## Tools

| Tool               | Input                                  | Output                                                       |
| ------------------ | -------------------------------------- | ------------------------------------------------------------ |
| `render_report`    | `content`/`path`, `title?`, `options?` | `{ session_id, url, status: "serving" }` (논블로킹)          |
| `collect_feedback` | `session_id`, `wait_seconds?`          | content(text+image) 또는 `{ status:"pending", draft_count }` |
| `close_report`     | `session_id`                           | `{ status: "closed" }`                                       |
| `open_settings`    | 없음                                   | `{ url }`                                                    |

- `render_report`: content/path 정확히 하나(아니면 `invalid_input`), `max_report_mb` 캡(`read_error`).
- `collect_feedback`: bounded long-poll, `wait_seconds ≤ 55`. `unknown`/`closed` 세션은 throw. `extra.signal` abort 시 정리.
- 도구 등록명은 snake_case, 심볼·파일은 camelCase.

## HTTP routes

[httpServer/DETAIL.md](./httpServer/DETAIL.md) 참조. token 보호(+`/assets` 면제), CSRF(json/multipart), 127.0.0.1 전용, idle 종료.

## Build outputs

- `bridge/mcp-server.cjs` — esbuild(node, cjs). mermaid/katex/highlight 미포함(가드 강제).
- `bridge/report.html`, `bridge/settings.html` — esbuild inline(런타임 로드).
- `bridge/assets/{highlight,mermaid,katex}.js` + `katex.css` + woff2 — lazy 렌더러 자산.

## Acceptance

- 4개 도구가 등록되고 envelope 가 일관된다.
- `mcp-server.cjs` 에 무거운 렌더러가 번들되지 않는다(빌드 가드).
- 뷰어 HTML 이 `__DALEN_STATE__` 주입과 함께 서빙된다.
