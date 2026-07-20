# httpServer — DETAIL

## Requirements

- 첫 `render_viewer`/`open_settings` 에서 1회 기동, 이후 재사용(싱글톤).
- 기동 시 프로젝트 스코프 해시를 1회 확정 — Claude 는 `process.cwd()`, 그 외 호스트는 도구 인자 `project_root`(부재 시 actionable throw, `process.cwd()` 폴백 금지).
- 세션 생존 = 뷰어 heartbeat + 도구 활동. 둘 다 `idle_shutdown_minutes`(기본 1분, heartbeat 30초보다 커야 함) 단절 시 폴백 종료(read-only 탭 닫기·Claude 크래시·`close_viewer` 누락 누수 방지).
- 세션 토큰 으로 `/r`·API 보호; `/assets` 는 토큰 면제(동적 import·폰트 하위요청).
- `__DEILEN_STATE__` 주입은 `escapeJsonForHtml`.
- `/api/image` 의 이미지 소스 목록(viewer.md 파싱 결과)은 세션별 소형 캐시(삽입순 상한 16, 서버 close 시 flush) — viewer.md 는 세션 생성 후 불변이므로 안전.
- 뷰어 state 에 `config.last_intent` 주입(저장된 제출 선호; 버튼 외형엔 미반영). 설정 저장(`POST /api/config`)은 폼 밖 `last_intent` 를 기존 값으로 merge-보존.

## API Contracts

- `ensureHttpServer(workspace?: string): Promise<HttpServerInstance>` — 기동 또는 재사용+touch. `workspace` 는 호출자가 이미 해석한 프로젝트 루트(생략 시 `projectRoot()` 로 해석); 이미 떠 있으면 무시된다(프로세스당 1 workspace).
- `getHttpServer(): HttpServerInstance | null`.
- `HttpServerInstance`: `{ baseUrl, port, token, viewerUrl(sid), settingsUrl(), touch(), close() }`.

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

## Acceptance

- 문서 페이지가 가독 HTML 로 렌더된다.
- 잘못된 token 은 401, 알 수 없는 세션은 404.
- idle 초과 시 서버가 종료되고 다음 `render_viewer` 가 재기동한다.
- `complete` 제출 시 세션이 `closed` 되어, 이후(동시 제출 포함) 제출은 409 로 거부된다.
- `complete` 제출의 `intent`(revise/discuss)은 `config.last_intent` 로 best-effort 영속(실패해도 제출 성공).
- `/api/ping` 은 serving 세션만 200; closed·없는 세션은 404 (캐시된 페이지의 submit 비활성 게이트).
