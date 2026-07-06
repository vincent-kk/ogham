[filid:lang:ko]

## Purpose

Atlassian setup 도구의 로컬 HTTP 서버 모듈. 127.0.0.1 전용 바인딩, 5분 inactivity 자동 종료. 공유 `@ogham/http-guard` 로 loopback Host(rebinding 차단)·토큰·CSRF Origin/Content-Type·XSS 방어 라우팅.

## Structure

| 위치              | 역할                                                                         |
| ----------------- | ---------------------------------------------------------------------------- |
| `index.ts`        | 배럴 — `startSetupServer`, `createRouteHandler`, `RouteContext` 노출         |
| `webServer.ts`    | `startSetupServer` — closure 기반 서버 lifecycle                             |
| `routes.ts`       | `createRouteHandler` — shared guard(host/token/origin/CT) + 경로 디스패치    |
| `routeContext.ts` | `RouteContext` 인터페이스 (routes ↔ handlers 순환 방지)                      |
| `constants/`      | `MASK` 등 모듈 내 상수                                                       |
| `utils/`          | sendJson, parseBody, escapeJsonForHtml, build\* 헬퍼 (one function per file) |
| `handlers/`       | GET/POST 라우트별 핸들러 함수 (one function per file)                        |

## Boundaries

### Always do

- 127.0.0.1 전용 바인딩 유지
- 모든 요청에 loopback Host + `?token=` 검증; POST 는 loopback Origin + `application/json` 강제 (rebinding·CSRF 방어)
- 자격증명은 `MASK` 상수로 가린 응답만 외부에 노출
- `__SETTINGS_STATE__` 주입 시 `escapeJsonForHtml`로 script breakout 차단
- 외부 consumer는 `index.ts` 배럴로만 접근

### Ask first

- 신규 API 라우트 추가 또는 기존 라우트 삭제
- 자동 종료 시간(5분) 또는 바인딩 주소 변경

### Never do

- CORS 와일드카드(`*`) 헤더 활성화
- 모듈 전역 mutable state 사용
- 외부 모듈에서 internal 파일(handlers/, utils/)에 직접 접근

## Dependencies

| 대상                 | 이유                                           |
| -------------------- | ---------------------------------------------- |
| `node:http`          | HTTP 서버                                      |
| `@ogham/http-guard`  | inspectRequest(host/token/CSRF), generateToken |
| `../../../../core/`  | `resolveEnvironment`                           |
| `../../../../types/` | `SetupFormDataSchema`, `ServiceCredentials` 등 |
