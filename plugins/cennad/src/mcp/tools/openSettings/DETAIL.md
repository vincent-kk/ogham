# openSettings — Contract

## Requirements

- `127.0.0.1` 전용 HTTP 서버를 띄우고 one-time token 으로 보호된 폼을 브라우저에 노출한다.
- 5분 idle 또는 사용자의 "Save & Close" 액션에서 자동 종료한다.
- 설정 HTML 은 런타임에 `public/settings.html` 에서 읽는다(번들 미포함).

## API Contracts

- `handleOpenSettings(...)` — 서버를 기동하고 토큰이 붙은 URL 을 돌려준다.
- `webServer/` — 로컬 HTTP 서버와 라우트.

## Acceptance Criteria

### AC-loopback-only — 바인딩 격리

- 서버가 `127.0.0.1` 외 주소에서 접근 가능하지 않다.

### AC-idle-shutdown — 유휴 종료

- 5분 무요청에서 서버가 닫히고, 요청이 오면 타이머가 리셋된다.

### AC-one-time-token — 일회용 토큰

- 기동마다 새 토큰이 발급되고 토큰 없는 요청은 거부된다.

## Last Updated

2026-07-30 — 설정 UI 기동 계약을 문서화했다.
