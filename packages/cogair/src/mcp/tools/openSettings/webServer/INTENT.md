## Purpose

`open_settings` 가 기동하는 로컬 HTTP 서버. `127.0.0.1` 전용 바인딩, 5 분 idle 자동 종료, one-time token 검증, CSRF 방어 (`application/json` 강제).

## Structure

| Path              | Role                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `webServer.ts`    | `startSettingsServer` — closure 기반 lifecycle (`{ url, token, close }`)                                                         |
| `routes.ts`       | `createRouteHandler` — token + Content-Type 가드 + 경로 디스패치                                                                 |
| `routeContext.ts` | 라우트와 핸들러를 잇는 context 인터페이스                                                                                        |
| `handlers/`       | GET `/`, `/config`, `/provider-status` (antigravity 가용 + `agyModels`), POST `/save` (저장 후 agy youtube MCP 동기화), `/close` |
| `utils/`          | sendJson, parseBody, escapeJsonForHtml, verifyToken (`core/authToken` 위임), buildState                                          |

## Conventions

- 모든 요청에 `?token=<...>` 검증 (timing-safe 비교)
- POST 는 `Content-Type: application/json` 강제 (CSRF 방어)
- CORS 헤더 미설정 — 동일 origin only
- 응답 본문 형태: `{ success: bool, message?, errors?, ...data }`
- `__COGAIR_STATE__` 슬롯에 `escapeJsonForHtml` 로 직렬화된 Config 주입

## Boundaries

### Always do

- `127.0.0.1` 전용 바인딩 (외부 인터페이스 금지)
- 모든 요청에서 token 검증 후 비즈니스 로직 진행
- 요청마다 idle 타이머 리셋
- 5 분 idle 시 자동 종료 (테스트는 `idleMs` 옵션으로 단축)

### Ask first

- 새 API 경로 추가
- 자동 종료 시간 또는 바인딩 주소 변경

### Never do

- CORS 와일드카드 활성화
- 모듈 전역 mutable state — 항상 closure 반환값으로 lifecycle 노출
- token 부재 또는 불일치 시 응답에 token 값을 echo
- 외부 origin 으로 fetch / proxy

## Dependencies

- `node:http`, `node:url`
- `../../../core/{configManager,agyMcpConfig}` (loadConfig, saveConfig, provisionYoutubeMcp)
- `../../../core/authToken` (generateToken, verifyToken)
- `../../../types/index.ts` (`ConfigSchema`)
