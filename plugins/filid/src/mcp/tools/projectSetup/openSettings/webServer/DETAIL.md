# webServer contract

## Requirements

- `project_setup`의 `settings` action이 기동하는 로컬 HTTP 서버다. `127.0.0.1` 전용으로 바인딩한다.
- 요청 검증 순서는 loopback Host → one-time token → POST Origin → `application/json`이다.
- 저장·닫기 이벤트를 settle waiter로 노출해 도구의 bounded long-poll을 해소한다.
- 공유 `@ogham/http-kit`을 쓰고 자체 HTTP 스택을 만들지 않는다.

## API Contracts

- `startSettingsServer(options)` — 바인딩된 서버와 settle waiter를 반환한다.
- `SETTINGS_SERVER_IDLE_MS` — idle 종료 기준값.

## Acceptance Criteria

### AC-websrv-loopback — loopback 전용

- 비 loopback Host, 잘못된 token, 잘못된 Origin 요청이 모두 거부된다.

### AC-websrv-settle — bounded 대기 해소

- 저장 또는 닫기 이벤트가 대기 중인 도구 호출을 정확히 한 번 깨운다.

## History

- 2026-09-05 — HTTP 계약을 바꾸지 않고 `project_setup` settings child로 소유 관계를 갱신했다.
- 2026-07-28 — 중간 계층 fractal 계약을 문서화했다.

## Last Updated

2026-09-05
