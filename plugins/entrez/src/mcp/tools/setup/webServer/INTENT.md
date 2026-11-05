# webServer

## Purpose

`setup` 도구의 로컬 설정 HTTP 서버다. 서버 수명주기와 설정 폼·상태 조회·연결 테스트·저장의 HTTP 경계를 소유한다.

## Conventions

- 공개 경계는 배럴로 한정한다 — 내부 라우트·서버 상태에 소비자가 직접 결합하지 않게 한다.
- 모듈 전역 가변 상태 없음 — 서버 상태(`server`/`timer`/`closed`)는 `startSetupServer` 클로저에 캡슐화.
- 서버 기동 시마다 새 토큰 발급 → 반환 URL에 `?token=` 부착.
- 매 요청 `ctx.resetTimer()` 호출로 유휴 자동 종료 타이머 갱신.

## Boundaries

### Always do

- 새 라우트는 `routing/routes.ts` 디스패치에 등록하고 `handlers/` 아래 핸들러 파일로 추가한다.
- 요청 처리 시작 시 `resetTimer()`를 호출해 자동 종료 타이머를 갱신한다.

### Ask first

- 자동 종료 시간(`SETUP_AUTO_SHUTDOWN_MS`) 변경, 바인딩 주소(127.0.0.1) 변경.

### Never do

- CORS 헤더 추가, 모듈 전역 가변 상태 도입, `index.ts` 외 내부 파일 직접 import로 소비.
