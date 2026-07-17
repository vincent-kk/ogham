# webServer

## Purpose

`setup` 도구의 로컬 설정 HTTP 서버. 127.0.0.1 임의 포트에서 기동해 라우트 테이블(`/` `/status` `/test` `/submit`)과 요청별 컨텍스트(`RouteContext`: config/credentials 로드·저장, 연결 테스트, 타이머·서버 종료 콜백)를 제공한다. 유휴 시 자동 종료.

## Structure

| 파일              | 역할                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| `webServer.ts`    | `startSetupServer` — 서버 기동, 토큰 발급, resetTimer/closeServer 결선                             |
| `routes.ts`       | `createRouteHandler` — http-guard 검증 후 method/path 디스패치                                     |
| `routeContext.ts` | `RouteContext` 타입 — handler 의존성 + lifecycle 콜백                                              |
| `handlers/`       | `/`·`/status`·`/test`·`/submit` 핸들러 organ                                                       |
| `utils/`          | `sendJson`·`parseBody`·`maskApiKey`·`escapeJsonForHtml`·`buildStatus`·`buildPathSuggestions` organ |

## Conventions

- 공개 진입점은 `index.ts` 배럴만 — `startSetupServer`, `SetupServerOptions`, `createRouteHandler`, `RouteContext`.
- 모듈 전역 가변 상태 없음 — 서버 상태(`server`/`timer`/`closed`)는 `startSetupServer` 클로저에 캡슐화.
- 서버 기동 시마다 새 토큰 발급 → 반환 URL에 `?token=` 부착.
- 매 요청 `ctx.resetTimer()` 호출로 유휴 자동 종료 타이머 갱신.

## Boundaries

### Always do

- 새 라우트는 `routes.ts` 디스패치에 등록하고 `handlers/` 아래 핸들러 파일로 추가한다.
- 요청 처리 시작 시 `resetTimer()`를 호출해 자동 종료 타이머를 갱신한다.

### Ask first

- 자동 종료 시간(`SETUP_AUTO_SHUTDOWN_MS`) 변경, 바인딩 주소(127.0.0.1) 변경.

### Never do

- CORS 헤더 추가, 모듈 전역 가변 상태 도입, `index.ts` 외 내부 파일 직접 import로 소비.

## Dependencies

- `@ogham/http-guard/{guard,token}` — `inspectRequest`(loopback Host → 토큰 → POST loopback Origin → `application/json`), `generateToken`
- `../../../../types/setup` · `../../../../constants/defaults`(`SETUP_AUTO_SHUTDOWN_MS`)
