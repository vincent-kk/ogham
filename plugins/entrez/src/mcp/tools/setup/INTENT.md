## Purpose

`setup` 도구. 로컬 HTTP 서버(127.0.0.1)로 브라우저 설정 폼을 띄운다. 비밀(api_key)은 브라우저→로컬서버→`credentials.json`(0o600)로만 흐르고 LLM/채팅을 거치지 않는다. atlassian setup 차용.

## Structure

| 위치                        | 역할                                                            |
| --------------------------- | --------------------------------------------------------------- |
| `setup.ts`                  | `handleSetup` — 서버 기동 + 브라우저 오픈, `{success,url}` 반환 |
| `utils/loadSettingsHtml.ts` | `public/settings.html` 런타임 로드                              |
| `utils/testConnection.ts`   | EInfo 도달성 probe(저장 전)                                     |
| `webServer/`                | node:http 서버·라우트·핸들러(/ ·/status ·/test ·/submit)        |

## Conventions

- 공유 `@ogham/http-guard` 가드: loopback Host(rebinding 차단) → `?token=` → POST loopback Origin + `application/json`(CSRF). 127.0.0.1 전용, 유휴 5분 자동 종료.
- 서버 기동마다 토큰 발급 → URL `?token=` 부착 → 브라우저 폼이 모든 요청에 echo.
- `/submit`은 EInfo 통과 시에만 config/credentials 분리 저장 후 종료.
- masked api_key(`••••`)는 미변경 의미 — 기존값 복원.

## Boundaries

### Always do

- credentials는 0o600 기록. 응답에 api_key 평문 미포함(마스킹만).
- `__ENTREZ_STATE__` 주입 시 `escapeJsonForHtml`로 script breakout 차단.

### Ask first

- 새 라우트 추가, 자동 종료 시간·바인딩 주소 변경.

### Never do

- CORS 와일드카드, 모듈 전역 가변 상태, 외부 HTTP 프레임워크.

## Dependencies

- `@ogham/http-guard/{guard,token}` (inspectRequest, generateToken)
- `../../../core/config` · `@ogham/cross-platform/launcher`
- `../../../core/{httpClient,sourceResolver}` · `../../../types/setup`
