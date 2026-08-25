# httpServer — DETAIL

## Requirements

- 첫 `render_viewer`/`open_settings` 에서 1회 기동, 이후 재사용(싱글톤).
- 기동 시 프로젝트 스코프 해시를 1회 확정 — Claude 는 `process.cwd()`, 그 외 호스트는 도구 인자 `project_root`(부재 시 actionable throw, `process.cwd()` 폴백 금지).
- 리스너 수명 = serving 세션. 이 프로세스가 만든 세션이 하나라도 `serving` 이거나 collect 대기가 진행 중이면 idle 타이머는 재무장만 한다. 세션이 모두 닫힌 뒤(제출·dismiss·`close_viewer`·TTL 정리) 마지막 활동으로부터 `idle_shutdown_minutes`(기본 1분) 가 지나면 종료한다. 뷰어 heartbeat 는 종료 판정의 근거가 아니라 페이지 쪽 세션 상태 확인(`/api/ping` 404 → submit 비활성)이다.
- 세션 토큰 으로 `/r`·API 보호; `/assets` 는 토큰 면제(동적 import·폰트 하위요청).
- `__DEILEN_STATE__` 주입은 `escapeJsonForHtml`.
- `/api/image` 의 이미지 소스 목록(viewer.md 파싱 결과)은 세션별 소형 캐시(삽입순 상한 16, 서버 close 시 flush) — viewer.md 는 세션 생성 후 불변이므로 안전.
- 뷰어 state 에 `config.last_intent` 주입(저장된 제출 선호; 버튼 외형엔 미반영). 설정 저장(`POST /api/config`)은 폼 밖 `last_intent` 를 기존 값으로 merge-보존.
- 뷰어 state 에 `draft` 를 주입한다: `feedback.json` 이 `in_progress` 면 `{ overall, comments, updated_at }`, 없거나 `complete` 면 `null`. 함께 `session_ttl_hours` 를 주입해 페이지 쪽 초안 TTL 의 기준으로 삼는다.
- 설정은 `user`·`project` 두 레이어다. `GET /api/config` 와 `GET /settings` 는 두 레이어 원문과 병합 결과를 함께 담은 `ConfigScopeState` 를 싣고, `POST /api/config` 는 대상 레이어를 본문의 `scope` 로 받아 그 레이어만 덮어쓴다. 저장 문서는 고른 레이어에서 출발한다 — 병합 결과에서 출발하면 `user` 저장이 project 재정의를 user 파일에 구워 넣는다.

## API Contracts

- `ensureHttpServer(workspace?: string): Promise<HttpServerInstance>` — 기동 또는 재사용+touch. `workspace` 는 호출자가 이미 해석한 프로젝트 루트(생략 시 `projectRoot()` 로 해석); 이미 떠 있으면 무시된다(프로세스당 1 workspace).
- `getHttpServer(): HttpServerInstance | null`.
- `HttpServerInstance`: `{ baseUrl, port, token, viewerUrl(sid), settingsUrl(), touch(), close() }`.
- `GET /api/config` → `{ ok: true, state: ConfigScopeState }`. `state.layers.{user,project}` 는 각 레이어 원문(부재·손상 모두 `null`), `state.effective` 는 병합 결과, `state.paths` 는 두 레이어의 절대 경로다.
- `POST /api/config` 본문은 `{ scope: "user" | "project", config: object }`. `scope` 는 기본값이 없다 — 두 레이어 모두 유효한 대상이라 조용한 기본값은 반대편 파일을 쓰게 만든다. 형태가 어긋나면 400 `Body must be { scope: "user" | "project", config: object }`, `project` 인데 프로젝트 경로가 없으면 400. 성공 응답은 `{ ok: true, state: ConfigScopeState }` 로 저장 후 상태를 돌려준다.

## Routes

| Method | Path                              | Handler             | Token |
| ------ | --------------------------------- | ------------------- | ----- |
| GET    | `/r/<session>?token=`             | handleGetViewer     | yes   |
| GET    | `/api/viewer?session=&token=`     | handleGetViewerData | yes   |
| GET    | `/api/image/<sid>/<index>?token=` | handleGetImage      | yes   |
| GET    | `/settings?token=`                | handleGetSettings   | yes   |
| GET    | `/api/config?token=`              | handleGetConfig     | yes   |
| GET    | `/assets/<chunk>`                 | handleGetAsset      | no    |
| POST   | `/api/ping?session=&token=`       | handlePing          | yes   |
| POST   | `/api/feedback?session=&token=`   | handlePostFeedback  | yes   |
| POST   | `/api/config?token=`              | handleSaveConfig    | yes   |
| POST   | `/api/close?session=&token=`      | handleClose         | yes   |

## Security

- `session_id` `^[A-Za-z0-9_-]+$` + sessionStore 등록분만.
- `/assets`: 단일 안전 세그먼트 + 허용 확장자 + `public/assets` 내부 존재만.
- `/api/image`: viewer.md 가 참조한 `file://` 이미지만 서빙(문서 멤버십 = allowlist, 임의 경로 차단) + 표시 확장자 화이트리스트(png/jpg/jpeg/gif/webp/svg) + `realpath` regular-file + `max_image_mb` 캡.
- token 미검증 401, 미지원 Content-Type 415, 미지원 경로 404.

## Acceptance Criteria

### AC-http-serving — 문서 서빙

- 문서 페이지가 가독 HTML 로 렌더된다.
- 잘못된 token 은 401, 알 수 없는 세션은 404 다.
- in_progress 자동저장이 있는 세션의 뷰어 HTML 은 state.draft 에 그 코멘트를 싣고, 없는 세션은 `draft: null` 이다.

### AC-http-lifecycle — 수명주기

- serving 세션이 남아 있는 동안은 idle 이 지나도 서버가 살아 있고, 마지막 세션이 닫힌 뒤 idle 초과 시 종료되며 다음 `render_viewer` 가 재기동한다.
- `/api/ping` 은 serving 세션만 200 이고 closed·미존재 세션은 404 다(캐시된 페이지의 submit 비활성 게이트).

### AC-feedback-submission — 제출 종결성

- `complete` 제출 시 세션이 `closed` 되어 이후 제출은(동시 제출 포함) 409 로 거부된다.
- `complete` 제출의 `intent`(revise/discuss)는 `config.last_intent` 로 best-effort 영속되며 실패해도 제출은 성공한다.

## History

- 2026-08-25 — heartbeat 기반 idle 회수를 serving 세션 수명으로 바꿨다. 숨겨진 탭의 타이머 억제가 collect 대기 종료 직후 리스너를 닫아 미전송 코멘트를 제출 불능으로 만들던 것이 이유다. 대가: 브라우저 X 로 닫혀 dismiss 가 오지 않은 탭은 프로세스 수명 동안 루프백 포트를 붙든다.

## Last Updated

2026-08-25 — 리스너 수명을 serving 세션에 묶고 뷰어 state 에 draft·session_ttl_hours 를 주입한다.
