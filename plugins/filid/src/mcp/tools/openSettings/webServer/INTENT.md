## Purpose

`open_settings` 가 기동하는 로컬 HTTP 서버. `127.0.0.1` 전용 바인딩, 공유
`@ogham/http-guard` 로 loopback Host → one-time token → POST Origin →
`application/json` 순 검증. 저장/닫기 이벤트를 settle waiter 로 노출해
도구의 bounded long-poll 을 해소한다.

## Structure

| Path                                | Role                                                                 |
| ----------------------------------- | -------------------------------------------------------------------- |
| `webServer.ts` (+`index.ts` barrel) | `startSettingsServer` — closure lifecycle + settle waiter 레지스트리 |
| `routing/`                          | `routes.ts` (guard + 경로 디스패치), `routeContext.ts`               |
| `handlers/`                         | GET `/` (상태 주입), POST `/save` (config+rule docs 영속), `/close`  |
| `utils/`                            | sendJson, parseBody, escapeJsonForHtml                               |

## Conventions

- 응답 본문 형태: `{ success: bool, message?, errors?, ...data }`
- `__FILID_STATE__` 슬롯에 `escapeJsonForHtml` 직렬화 상태 주입
- `/save` 성공이 waiter 를 `{ kind: 'saved', summary }` 로 settle; `/close` 와
  서버 종료는 `{ kind: 'closed' }` 로 settle
- idle 5 분 자동 종료 — 단, 활성 waiter 가 있으면 연장 (작성 중 폼 보호)
- 요청마다 idle 타이머 리셋; 테스트는 `idleMs` 옵션으로 단축

## Boundaries

### Always do

- `127.0.0.1` 전용 바인딩 (외부 인터페이스 금지)
- 모든 요청에서 guard 통과 후 비즈니스 로직 진행
- 저장 페이로드는 `SaveBodySchema` 로 검증 후 core 함수에 전달

### Ask first

- 새 API 경로 추가
- 자동 종료 시간 또는 바인딩 주소 변경

### Never do

- CORS 와일드카드 활성화
- 모듈 전역 mutable state — lifecycle 은 closure 반환값으로만 노출
- token 값을 응답에 echo

## Dependencies

- `node:http`
- `@ogham/http-guard/{guard,token}` — `inspectRequest`, `generateToken`
- `../../../../core/infra/configLoader` — 저장 core (`writeConfig`, `syncRuleDocs`)
