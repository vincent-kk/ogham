# setup — Contract

## Requirements

- 비밀은 채팅을 거치지 않는다. `api_key` 는 브라우저 → 로컬 서버 → `credentials.json`(0o600) 경로로만 흐른다.
- 서버는 `127.0.0.1` 임의 포트에 기동하고 유휴 5분에 자동 종료한다.
- 가드는 공유 `@ogham/http-kit` 를 쓴다: loopback Host 검사(DNS rebinding 차단) → `?token=` 검증 → POST 의 loopback Origin 과 `application/json` 확인(CSRF).
- `/submit` 은 EInfo probe 를 통과했을 때만 config 와 credentials 를 분리 저장하고 서버를 닫는다.
- 마스킹된 `api_key`(`••••`)는 "변경 없음"을 뜻한다 — 기존 값을 복원하고 마스크를 저장하지 않는다.
- `__ENTREZ_STATE__` 주입에는 `escapeJsonForHtml` 을 써서 script breakout 을 막는다.
- 도구는 서버를 띄우고 브라우저를 연 뒤 `{ success, url }` 을 즉시 돌려준다 — 사용자의 입력을 기다리지 않는다.
- 설정 페이지 HTML 은 런타임에 `public/settings.html` 에서 읽는다(번들 미포함).
- 저장 전 EInfo 도달성 probe 로 입력값을 확인한다.

## API Contracts

- `handleSetup(...)` — 서버 기동 + 브라우저 오픈, `{ success, url }` 반환.
- `utils/loadSettingsHtml.ts` — `public/settings.html` 런타임 로드.
- `utils/testConnection.ts` — 저장 전 EInfo 도달성 probe.
- `webServer/` — 로컬 HTTP 서버와 라우트(`/`·`/status`·`/test`·`/submit`).

## Acceptance Criteria

### AC-secret-path — 비밀 전달 경로

- `api_key` 가 MCP 응답과 로그 어디에도 나타나지 않는다.
- 저장된 credentials 파일 권한이 0o600 이다.

### AC-setup-nonblocking — 논블로킹 반환

- 도구 호출이 사용자의 폼 제출을 기다리지 않고 URL 과 함께 즉시 돌아온다.

## Last Updated

2026-07-30 — 설정 도구의 비밀 전달 경로 계약을 문서화했다.
