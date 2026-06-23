# httpServer — DETAIL

## Requirements

- 첫 `render_viewer`/`open_settings` 에서 1회 기동, 이후 재사용(싱글톤).
- 세션 생존 = 뷰어 heartbeat + 도구 활동. 둘 다 `idle_shutdown_minutes` 단절 시 폴백 종료(Claude 크래시·`close_viewer` 누락 누수 방지).
- one-time token 으로 `/r`·API 보호; `/assets` 는 토큰 면제(동적 import·폰트 하위요청).
- `__DEILEN_STATE__` 주입은 `escapeJsonForHtml`.

## API Contracts

- `ensureHttpServer(): Promise<HttpServerInstance>` — 기동 또는 재사용+touch.
- `getHttpServer(): HttpServerInstance | null`.
- `HttpServerInstance`: `{ baseUrl, port, token, viewerUrl(sid), settingsUrl(), touch(), close() }`.

## Routes (Phase 2)

| Method | Path                          | Handler             | Token |
| ------ | ----------------------------- | ------------------- | ----- |
| GET    | `/r/<session>?token=`         | handleGetViewer     | yes   |
| GET    | `/api/viewer?session=&token=` | handleGetViewerData | yes   |
| GET    | `/assets/<chunk>`             | handleGetAsset      | no    |
| POST   | `/api/ping?session=&token=`   | handlePing          | yes   |

이후 단계: POST `/api/feedback`(Phase 3), `/settings`·`/api/config`·POST `/api/close`(Phase 5/6).

## Security

- `session_id` `^[A-Za-z0-9_-]+$` + sessionStore 등록분만.
- `/assets`: 단일 안전 세그먼트 + 허용 확장자 + `bridge/assets` 내부 존재만.
- token 미검증 401, 미지원 Content-Type 415, 미지원 경로 404.

## Acceptance

- 문서 페이지가 가독 HTML 로 렌더된다.
- 잘못된 token 은 401, 알 수 없는 세션은 404.
- idle 초과 시 서버가 종료되고 다음 `render_viewer` 가 재기동한다.
- `complete` 제출 시 세션이 `closed` 되어, 이후(동시 제출 포함) 제출은 409 로 거부된다.
