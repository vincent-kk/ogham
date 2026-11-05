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

loopback 정규식은 내부 정책이므로 공개 표면으로 확장하지 않는다. 구체적인 입력 타입과 verdict 필드는 진입점과 테스트에서 확인한다.

## Acceptance Criteria

동작별 결과는 테스트가 고정하며, 정책과 경계 보장은 위 계약을 따른다.

## Last Updated

요청 검사 순서·POST 정책 또는 verdict 책임의 범위가 바뀔 때 갱신한다.
