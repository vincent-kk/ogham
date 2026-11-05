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

- 응답은 success와 오류 설명을 공통 외피로 쓴다. 저장·닫힘과 타임아웃을 구분하여 호출자가 대기를 재개할 수 있게 한다.
- HTML 상태 주입은 escapeJsonForHtml을 거친다. 브라우저 데이터가 script 경계를 닫지 않아야 한다.

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

요청 가드·저장·settle·서버 수명 계약의 내용과 근거가 바뀔 때 갱신한다.
