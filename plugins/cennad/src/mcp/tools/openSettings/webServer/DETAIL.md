# webServer — Contract

## Requirements

- `127.0.0.1` 에만 바인딩하고 5분 idle 에 자동 종료한다.
- 검증 순서는 공유 `@ogham/http-kit` 을 따른다: loopback Host(DNS rebinding 차단) → one-time token → POST Origin(CSRF) → `application/json` 강제.
- 토큰·Origin 검증을 이 모듈에서 재구현하지 않는다.
- 응답에 토큰을 echo 하지 않는다.
- `GET /`은 user config layer 경로에서 파생한 active cennad home을 페이지 상태로 주입한다.

## API Contracts

- 서버 기동 — 토큰 발급과 라우트 등록, idle 타이머 결선.
- 라우트 — 폼 조회와 저장.

## Acceptance Criteria

### AC-guard-order — 가드 순서

- loopback 이 아닌 Host, 토큰 없는 요청, 비-loopback Origin 의 POST, 지원하지 않는 Content-Type 이 각각 거부된다.

### AC-idle-shutdown — 유휴 종료

- 서버가 요청을 관측할 때마다 종료 기한을 그 시점부터 다시 계산하고, 그 뒤 5분 동안 새 요청이 없을 때 서버가 닫힌다.

### AC-no-token-echo — 토큰 비노출

- 응답 본문에 토큰이 포함되지 않는다.

### AC-active-home-source — 경로 소스 일치

- 페이지가 표시하는 active home은 동일 요청의 `ConfigScopeState.paths.user`와 같은 resolver 결과에서 파생된다.

## Last Updated

2026-08-23 — idle 재설정과 active cennad home 주입 계약을 명확히 했다.
