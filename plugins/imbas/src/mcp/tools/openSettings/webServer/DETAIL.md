# webServer — Contract

## Requirements

- `open_settings` 가 기동하는 로컬 HTTP 서버다. `127.0.0.1` 에만 바인딩한다 — 외부 인터페이스에 바인딩하면 설정 편집 표면이 네트워크에 노출된다.
- 모든 요청은 guard 를 먼저 통과한다. 검증 순서는 loopback Host → one-time token → POST Origin → `application/json` 이며 `@ogham/http-kit` 이 소유한다.
- 저장/닫기 이벤트를 settle waiter 로 노출해 도구의 bounded long-poll 을 해소한다. `/save` 성공은 `{ kind: 'saved', summary }`, `/close` 와 서버 종료는 `{ kind: 'closed' }` 로 settle 한다.
- lifecycle 은 closure 반환값으로만 노출한다. 모듈 전역 mutable state 를 두면 한 프로세스에서 두 번째 기동이 첫 번째의 waiter 를 덮어쓴다.
- token 값을 응답 본문에 echo 하지 않는다.
- 저장 페이로드는 `SettingsSaveBodySchema` 로 검증한 뒤에만 core 함수에 넘긴다.
- idle 5분에 자동 종료하되, 활성 waiter 가 있으면 타이머를 연장한다. 요청마다 타이머를 리셋하고, 테스트는 `idleMs` 옵션으로 단축한다.

## API Contracts

```typescript
export const SETTINGS_SERVER_IDLE_MS: number;
export function startSettingsServer(
  options: StartSettingsServerOptions,
): Promise<SettingsServerInstance>;
export type { SettingsServerInstance, StartSettingsServerOptions };
```

- 라우트는 셋이다: `GET /`(상태 주입 HTML), `POST /save`(config 영속), `POST /close`.
- 응답 본문 형태는 `{ success: boolean, message?, errors?, ...data }` 로 통일한다.
- `GET /` 은 `__IMBAS_STATE__` 슬롯에 `escapeJsonForHtml` 로 직렬화한 상태를 주입한다.
- `routing/` 은 guard 와 경로 디스패치를, `handlers/` 는 라우트별 처리를 담당하는 organ 이며 배럴로 나가지 않는다.

## Acceptance Criteria

### AC-webserver-loopback-bind — 루프백 전용 바인딩

- `listen` 호출의 host 인자가 `127.0.0.1` 이다.
- `0.0.0.0` 문자열이 `webServer/**` 에 없다.

### AC-webserver-guard-first — guard 선행

- 토큰 없는 요청이 모든 라우트에서 비즈니스 로직 도달 전에 거부된다.
- 비 loopback Host 헤더 요청이 거부된다.
- `POST` 요청의 Origin 이 허용 목록 밖이면 거부된다.

### AC-webserver-settle-kinds — settle 종류

- `/save` 성공 후 waiter 가 `kind: 'saved'` 로 settle 된다.
- `/close` 후, 그리고 서버 종료 시 waiter 가 `kind: 'closed'` 로 settle 된다.

### AC-webserver-no-token-echo — 토큰 비노출

- 어떤 라우트의 응답 본문에도 발급된 token 문자열이 포함되지 않는다.

### AC-webserver-no-module-state — 전역 상태 부재

- `webServer/**` 최상위에 재할당되는 `let` · `var` 선언이 없다.
- 같은 프로세스에서 두 인스턴스를 기동해도 서로의 waiter 에 영향을 주지 않는다.

### AC-webserver-idle-shutdown — idle 종료

- `idleMs` 를 짧게 준 인스턴스가 요청 없이 그 시간 뒤 종료한다.
- 활성 waiter 가 있는 동안에는 종료하지 않는다.

### AC-webserver-payload-validated — 저장 검증

- 스키마에 맞지 않는 `/save` 본문이 `success: false` 와 `errors` 를 반환하고 config 를 쓰지 않는다.

## Last Updated

2026-08-06 — 루프백 바인딩·guard 순서·settle waiter·idle 종료 계약을 최초 문서화했다.
