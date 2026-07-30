# renderViewer — Contract

## Requirements

- `render_viewer` 는 논블로킹이다 — 세션을 만들고 URL 을 즉시 돌려주며, 사용자의 응답을 기다리지 않는다.
- `content` 와 `path` 중 정확히 하나만 받는다. 둘 다이거나 둘 다 아니면 `invalid_input` 이다.
- 상대 `path` 는 워크스페이스 기준으로 해석하고 절대 `path` 는 그대로 쓴다.
- 문서 크기가 `max_viewer_mb` 를 넘으면 `read_error` 다.
- 프로젝트 스코프는 `ensureHttpServer` 보다 먼저 해석한다 — 순서가 뒤집히면 서버 스코프와 세션 해시가 어긋난다.

## API Contracts

- `handleRenderViewer(...)` — `{ session_id, url, status: "serving" }` 를 돌려준다.
- 입력: `content` 또는 `path`(택일), `title?`, `options?`, `project_root?`.

## Acceptance Criteria

### AC-render-input-exclusivity — 입력 택일

- `content` 와 `path` 를 함께 주면 `invalid_input` 이다.
- 둘 다 없어도 `invalid_input` 이다.

### AC-render-size-cap — 크기 상한

- `max_viewer_mb` 를 넘는 문서는 `read_error` 로 거부된다.

### AC-render-nonblocking — 논블로킹 반환

- 호출은 사용자 입력을 기다리지 않고 `serving` 상태로 즉시 돌아온다.

## Boundary Exemptions

### renderViewer.ts — Dev script direct import

- **Consumers**: `**/scripts/devViewer.ts`
- **Direct import**: allowed
- **Reason**: `scripts/devViewer.ts` 는 MCP 서버를 띄우지 않고 뷰어만 확인하는 개발 스크립트다. 배포 번들에 들어가지 않으며 배럴을 경유하면 도구 4개와 그 의존 전체를 끌어온다.

## Last Updated

2026-07-30 — 입력 택일·크기 상한 계약과 개발 스크립트 면책을 문서화했다.
