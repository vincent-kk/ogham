# webServer — Contract

## Requirements

- 설정 페이지에 `initialScope`를 주입한다. 공통 `resolveInitialConfigScope`가 project 설정 존재 → user 설정 존재 → 최초 project 순으로 결정하며, 페이지가 조건을 중복하지 않는다.

- `127.0.0.1` 에만 바인딩하고 5분 idle 에 자동 종료한다.
- 검증 순서는 공유 `@ogham/http-kit` 을 따른다: loopback Host(DNS rebinding 차단) → one-time token → POST Origin(CSRF) → `application/json` 강제.
- 토큰·Origin 검증을 이 모듈에서 재구현하지 않는다.
- 응답에 토큰을 echo 하지 않는다.
- `GET /`은 user config layer 경로에서 파생한 active cennad home을 페이지 상태로 주입한다.

## API Contracts

- 서버 기동 — 토큰 발급과 라우트 등록, idle 타이머 결선.
- 라우트 — 폼 조회와 저장.

## Acceptance Criteria

### AC-no-token-echo — 토큰 비노출

- 응답 본문에 토큰이 포함되지 않는다.

## Last Updated

loopback 인증·idle 수명·설정 상태 주입 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
