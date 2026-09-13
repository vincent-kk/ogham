# webServer — Contract

## Requirements

- setup 제출에서 `scope`가 생략되면 `project`에 저장한다. `user` 저장은 명시적 선택에 한하며, 인증정보는 기존 별도 저장 계약을 따른다.

- `127.0.0.1` 임의 포트에만 바인딩한다. 기동마다 토큰을 새로 발급한다.
- 모든 라우트는 가드를 통과한다: loopback Host → `?token=` → POST 의 loopback Origin 과 `application/json`.
- 라우트는 넷뿐이다: `/`(폼), `/status`, `/test`(도달성 probe), `/submit`(저장 후 종료).
- 요청마다 유휴 타이머를 리셋하고, 시간이 다하면 스스로 닫는다.
- 모듈 전역 가변 상태를 두지 않는다 — 서버 인스턴스 상태는 closure 안에 산다.
- `api_key` 는 응답에서 마스킹만 한다.

## API Contracts

- `startSetupServer(...)` — 서버를 기동하고 토큰을 발급하며 `resetTimer`·`closeServer` 를 결선한다.
- `routing/routes.ts` — 가드와 라우트 디스패치.
- `routing/routeContext.ts` — `RouteContext`: config·credentials 로드/저장, 연결 테스트, 타이머·종료 콜백.
- `handlers/` — `/`·`/status`·`/test`·`/submit` 핸들러.
- `utils/` — `maskApiKey`·`buildStatus`·`buildPathSuggestions`.

## Acceptance Criteria

### AC-submit-project-default — 제출 기본 범위

- scope 생략과 명시적 project는 프로젝트 설정에 저장하고, 명시적 user만 전역 설정에 저장한다.

### AC-loopback-only — 바인딩 격리

- 서버가 `127.0.0.1` 외 주소에서 접근 가능하지 않다.
- loopback 이 아닌 Host 헤더 요청은 거부된다.

### AC-token-guard — 토큰 가드

- 토큰 없는 요청은 거부된다.
- 토큰은 기동마다 새로 발급된다.

### AC-idle-shutdown — 유휴 종료

- 요청이 없으면 유휴 시간 후 서버가 닫힌다.
- 요청이 오면 타이머가 리셋된다.

### AC-submit-gate — 저장 게이트

- `/submit` 은 도달성 probe 통과 시에만 저장한다.
- 마스킹된 `api_key` 제출은 기존 값을 유지하고 마스크 문자열을 저장하지 않는다.

## Last Updated

2026-09-13 — 프로젝트 기본 범위와 명시적 전역 저장 선택 계약을 반영했다.
