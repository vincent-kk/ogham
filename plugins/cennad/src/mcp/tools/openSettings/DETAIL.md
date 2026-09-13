# openSettings — Contract

## Requirements

- 설정 화면을 열거나 재사용하는 것만으로 user 설정 파일을 정리하거나 다시 쓰지 않는다. 설정 변경은 명시적인 저장 선택을 따른다.

- `127.0.0.1` 전용 HTTP 서버를 띄우고 one-time token 으로 보호된 폼을 브라우저에 노출한다.
- 5분 idle 또는 사용자의 "Save & Close" 액션에서 자동 종료한다.
- 설정 HTML 은 런타임에 `public/settings.html` 에서 읽는다(번들 미포함).

## API Contracts

- `handleOpenSettings(...)` — 서버를 기동하고 토큰이 붙은 URL 을 돌려준다.
- `webServer/` — 로컬 HTTP 서버와 라우트.

## Acceptance Criteria

### AC-open-preserves-user-config — 열기 시 전역 설정 보존

- 구형 키가 있는 user 설정도 화면 열기·재사용 후 원문 바이트가 동일하다.

### AC-loopback-only — 바인딩 격리

- 서버가 `127.0.0.1` 외 주소에서 접근 가능하지 않다.

### AC-idle-shutdown — 유휴 종료

- 5분 무요청에서 서버가 닫히고, 요청이 오면 타이머가 리셋된다.

### AC-one-time-token — 일회용 토큰

- 기동마다 새 토큰이 발급되고 토큰 없는 요청은 거부된다.

## Last Updated

2026-09-13 — 프로젝트 기본 범위와 명시적 전역 저장 선택 계약을 반영했다.
