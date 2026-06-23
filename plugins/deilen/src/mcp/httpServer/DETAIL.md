# httpServer — DETAIL

## Requirements

- 첫 `render_viewer`/`open_settings` 에서 1회 기동, 이후 재사용(싱글톤).
- serving 세션 refcount: `render_viewer` 가 `retain`, 명시적 close(`complete` 제출·`close_viewer`·`/api/close`)가 `release`. 마지막 세션 release 시 `REAP_GRACE_MS` 후 종료(즉시 회수).
- idle 폴백: 모든 요청·도구 활동이 idle 타이머 리셋. `idle_shutdown_minutes`(기본 1분) 무활동 시 종료 — 명시적 close 없이 탭만 닫은 read-only 경우·Claude 크래시 누수 방지. idle 은 heartbeat 간격(30초)보다 커야 열린 탭이 heartbeat 사이에 죽지 않음.
- 세션 토큰 으로 `/r`·API 보호; `/assets` 는 토큰 면제(동적 import·폰트 하위요청).
- `__DEILEN_STATE__` 주입은 `escapeJsonForHtml`.

## API Contracts

- `ensureHttpServer(): Promise<HttpServerInstance>` — 기동 또는 재사용+touch.
- `getHttpServer(): HttpServerInstance | null`.
- `HttpServerInstance`: `{ baseUrl, port, token, viewerUrl(sid), settingsUrl(), touch(), retain(sid), release(sid), close() }`.
- `retain(sid)` 등록 + 대기 중 reap 취소. `release(sid)` 해제 후 0 이면 grace reap 예약. 둘 다 종료된 서버에서는 no-op.

## Routes

| Method | Path                            | Handler             | Token |
| ------ | ------------------------------- | ------------------- | ----- |
| GET    | `/r/<session>?token=`           | handleGetViewer     | yes   |
| GET    | `/api/viewer?session=&token=`   | handleGetViewerData | yes   |
| GET    | `/settings?token=`              | handleGetSettings   | yes   |
| GET    | `/api/config?token=`            | handleGetConfig     | yes   |
| GET    | `/assets/<chunk>`               | handleGetAsset      | no    |
| POST   | `/api/ping?session=&token=`     | handlePing          | yes   |
| POST   | `/api/feedback?session=&token=` | handlePostFeedback  | yes   |
| POST   | `/api/config?token=`            | handleSaveConfig    | yes   |
| POST   | `/api/close?session=&token=`    | handleClose         | yes   |

## Security

- `session_id` `^[A-Za-z0-9_-]+$` + sessionStore 등록분만.
- `/assets`: 단일 안전 세그먼트 + 허용 확장자 + `bridge/assets` 내부 존재만.
- token 미검증 401, 미지원 Content-Type 415, 미지원 경로 404.

## Acceptance

- 문서 페이지가 가독 HTML 로 렌더된다.
- 잘못된 token 은 401, 알 수 없는 세션은 404.
- 마지막 serving 세션이 명시적으로 닫히면(`complete` 제출·`close_viewer`) 서버가 grace 후 종료된다.
- 명시적 close 없이 idle 초과(read-only 탭 닫기·크래시) 시에도 서버가 종료되고, 다음 `render_viewer` 가 재기동한다.
- `complete` 제출 시 세션이 `closed` 되어, 이후(동시 제출 포함) 제출은 409 로 거부된다.
- `/api/ping` 은 serving 세션만 200; closed·없는 세션은 404 (캐시된 페이지의 submit 비활성 게이트).
