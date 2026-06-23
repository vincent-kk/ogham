## Purpose

`render_viewer`/`open_settings` 가 공유하는 단일 로컬 HTTP 서버(127.0.0.1). 세션 내내 살아있는 싱글톤으로, 뷰어 HTML·피드백 API·설정 UI 를 서빙하고, serving 세션 refcount 가 0 이 되면(명시적 close) 즉시 회수, 그 외엔 heartbeat + idle 폴백으로 종료해 누수를 차단한다.

## Structure

| Path            | Role                                                                  |
| --------------- | --------------------------------------------------------------------- |
| `httpServer.ts` | `ensureHttpServer`/`getHttpServer` — 싱글톤 lifecycle(closure)        |
| `routing/`      | `routes`(디스패치 + token/CSRF 가드) + `routeContext`(organ)          |
| `handlers/`     | GET `/r/<sid>`·`/api/viewer`·`/assets/<chunk>`, POST `/api/ping` 외   |
| `utils/`        | sendJson·escapeJsonForHtml·bridgeRoot·resolveAssetPath·loadViewerHtml |
| `index.ts`      | barrel                                                                |

## Conventions

- 바인딩 `127.0.0.1` 전용, 포트 `config.preferred_port`(0=동적)
- 세션 토큰 검증 — **`/assets` 는 면제**(비민감 공개 라이브러리)
- POST 는 `application/json` 또는 `multipart/form-data` 만(CSRF)
- serving 세션 refcount(`retain`/`release`) 0 → grace 후 `close()`(즉시 회수); 그 외 모든 요청·도구 활동이 `touch()` → idle 폴백(`idle_shutdown_minutes`, 기본 1 분)
- 뷰어 HTML 은 런타임 로드(`bridge/viewer.html`) — 번들 비대화 회피

## Boundaries

### Always do

- `127.0.0.1` 전용 바인딩, 중복 `listen` 금지(싱글톤)
- `/assets` 외 모든 라우트에서 token 검증
- 요청마다 idle 타이머 리셋, 종료 시 모든 타이머 clear

### Ask first

- 새 라우트 추가
- 바인딩 주소·idle 정책 변경

### Never do

- CORS 와일드카드, 외부 origin fetch/proxy
- `bridge/assets` 외부 경로 서빙(traversal)
- `__DEILEN_STATE__` 주입 시 `escapeJsonForHtml` 우회

## Dependencies

- `node:http`, `node:fs`, `node:path`, `node:url`
- `../../core/{authToken,configManager,projectHash,sessionStore}`
- `../../render` (서버측 base 렌더)
