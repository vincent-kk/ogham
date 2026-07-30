# guard — Contract

## Requirements

- 검증 순서를 loopback host(403) → token(401) → POST origin(403) → POST content-type(415) 로 고정한다. host 를 토큰보다 먼저 보므로 토큰이 유출돼도 DNS rebinding 요청은 막힌다.
- `inspectRequest` 는 순수 함수다. `ServerResponse` 를 받지도 만지지도 않고 verdict 만 반환하며, 거부 응답 전송은 호출자가 자기 envelope 로 한다.
- `expectedToken` 이 `undefined` 면 토큰 검증을 건너뛴다. 값이 있으면 sibling `token` fractal 의 timing-safe 비교로만 판정하고, `providedToken` 부재는 빈 문자열로 취급해 거부한다.
- Origin·Content-Type 검사는 `POST` 에만 적용한다. Origin 헤더가 없는 POST 는 비브라우저 클라이언트로 보고 통과시키고, 있으면 loopback authority 만 허용한다.
- `allowedContentTypes` 기본값은 `application/json` 이며, 비교는 요청 값을 소문자로 낮춘 뒤 prefix 매칭이라 `multipart/form-data; boundary=…` 같은 파라미터 부착 값이 통과한다.
- verdict 는 discriminated union 이다. `ok: false` 일 때만 `status`·`code`·`message` 를 갖고, 거부는 항상 status 와 machine-readable code 를 함께 반환한다.
- 허용 host·origin 판정은 `operations/patterns.ts` 의 두 정규식만 거친다. 이를 우회하는 별도 허용 경로를 두지 않는다.
- fractal 루트에는 배럴과 문서만 둔다. 판정 로직·정규식·타입은 `operations/` organ 이 갖는다.

## API Contracts

패키지 `exports` 는 `.` 하나만 선언한다. 소비자는 `@ogham/http-kit` 패키지 루트에서 이 fractal의 심볼을 가져오며, 내부 파일 직접 소비 경로는 없다.

- `inspectRequest(options: GuardOptions): GuardVerdict` — 요청 사실만으로 통과/거부를 판정한다. 부수효과 없음.
- `GuardOptions` — `host`·`method` 필수, `origin`·`contentType`·`expectedToken`·`providedToken`·`allowedContentTypes` 선택. 호출자가 `IncomingMessage` 에서 뽑아 넘기는 원시 사실이다.
- `GuardVerdict` — `{ ok: true }` 또는 `{ ok: false; status; code; message }`.
- `GuardRejectionCode` — `invalid_host` · `invalid_token` · `invalid_origin` · `unsupported_media_type` 네 값.
- `operations/` organ — `inspectRequest` 구현, loopback 정규식, 타입 선언. 배럴이 `inspectRequest` 와 세 타입만 이름으로 재수출하므로 `LOOPBACK_HOST`·`LOOPBACK_ORIGIN` 은 공개 표면이 아니다.

## Acceptance Criteria

### AC-check-order — 검증 순서 고정

- 유효한 토큰을 동봉해도 비-loopback Host 요청이 403 `invalid_host` 로 거부된다.
- 토큰 불일치는 401 `invalid_token`, 교차 출처 POST 는 403 `invalid_origin`, 미허용 매체 타입 POST 는 415 `unsupported_media_type` 로 거부된다.

### AC-post-only-csrf — POST 한정 CSRF 검사

- 비-POST 요청은 교차 출처 Origin 과 미허용 Content-Type 을 함께 갖고도 통과한다.
- Origin 헤더가 없는 POST 는 통과하고, loopback Origin 도 통과한다.

### AC-token-optional — 토큰 검증 선택성

- `expectedToken` 이 없으면 임의의 `providedToken` 이 와도 통과한다.
- `expectedToken` 과 일치하는 토큰이 통과한다.

### AC-content-type-prefix — 매체 타입 prefix 매칭

- `allowedContentTypes` 를 지정하면 파라미터가 붙은 값(`multipart/form-data; boundary=x`)이 prefix 매칭으로 통과한다.

### AC-verdict-purity — verdict 형태와 순수성

- 통과 verdict 는 `{ ok: true }` 뿐이고 status·code·message 를 갖지 않는다.
- 함수가 응답 객체를 요구하지 않으므로 요청 사실만으로 호출·검증된다.

## Last Updated

2026-07-30 — 검증 순서·POST 한정 검사·verdict 형태 계약과 `operations/` organ 배치를 문서화했다.
