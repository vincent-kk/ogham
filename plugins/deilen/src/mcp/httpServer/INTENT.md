## Purpose

`render_viewer`/`open_settings` 가 공유하는 단일 로컬 HTTP 서버(127.0.0.1). 세션 내내 살아있는 싱글톤으로, 뷰어 HTML·피드백 API·설정 UI 를 서빙하고, heartbeat + 폴백 idle 로 자동 종료해 누수를 차단한다.

## Structure

| Path            | Role                                                                             |
| --------------- | -------------------------------------------------------------------------------- |
| `httpServer.ts` | `ensureHttpServer`/`getHttpServer` — 싱글톤 lifecycle(closure)                   |
| `routing/`      | `routes`(디스패치 + token/CSRF 가드) + `routeContext`(organ)                     |
| `handlers/`     | GET `/r/<sid>`·`/api/viewer`·`/api/image`·`/assets/<chunk>`, POST `/api/ping` 외 |
| `constants/`    | 공용 정규식 패턴 (session id·`__DEILEN_STATE__` placeholder) (organ)             |
| `utils/`        | sendJson·escapeJsonForHtml·publicRoot·resolveAssetPath·loadViewerHtml            |
| `index.ts`      | barrel                                                                           |

## Conventions

- 바인딩 `127.0.0.1` 전용, 포트 `config.preferred_port`(0=동적)
- 세션 토큰 검증 — **`/assets` 는 면제**(비민감 공개 라이브러리)
- `/api/image` 는 viewer.md 멤버십 + 토큰으로 로컬 `file://` 만 서빙(임의 경로 차단)
- POST 는 `application/json` 또는 `multipart/form-data` 만(CSRF)
- 모든 요청·도구 활동이 `touch()` → idle 타이머 리셋; `idle_shutdown_minutes`(기본 1분) 초과 시 `close()`
- 뷰어 HTML 은 런타임 로드(`public/viewer.html`) — 번들 비대화 회피
- 세션 스코프 해시는 기동 시 1회 확정 — 호출자가 해석한 프로젝트 루트를 `ensureHttpServer(workspace?)` 로 받고, 부재 시 `projectRoot()` 로 해석(Claude=cwd, 그 외 호스트=`project_root` 인자·프로세스 메모)

## Boundaries

### Always do

- `127.0.0.1` 전용 바인딩, 중복 `listen` 금지(싱글톤), 기동 전 프로젝트 루트 해석
- `/assets` 외 모든 라우트에서 token 검증
- 요청마다 idle 타이머 리셋, 종료 시 모든 타이머 clear

### Ask first

- 새 라우트 추가
- 바인딩 주소·idle 정책 변경

### Never do

- CORS 와일드카드, 외부 origin fetch/proxy
- `public/assets` 외부 경로 서빙(traversal)
- `__DEILEN_STATE__` 주입 시 `escapeJsonForHtml` 우회

## Dependencies

- `node:http`, `node:fs`, `node:path`, `node:url`
- `@ogham/http-guard` (inspectRequest — host/token/CSRF 가드, generateToken), `@ogham/cross-platform/host-paths` (pluginRoot·projectRoot)
- `../../core/{configManager,projectHash,sessionStore}`, `../../render` (서버측 base 렌더)
