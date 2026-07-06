## Purpose

브라우저가 로컬 서버(127.0.0.1)로 보내는 요청의 도달성·CSRF 벡터를 검사한다. `inspectRequest` 는 요청 사실(host/method/origin/content-type/token)만 받아 통과/거부 verdict 를 반환하는 순수 함수 — 응답은 호출자가 자기 envelope 로 보낸다.

## Structure

| File                | Role                                                        |
| ------------------- | ----------------------------------------------------------- |
| `inspectRequest.ts` | verdict 결정 로직 (host → token → origin → content-type 순) |
| `patterns.ts`       | `LOOPBACK_HOST` / `LOOPBACK_ORIGIN` 정규식                  |
| `types.ts`          | `GuardOptions`, `GuardVerdict`, `GuardRejectionCode`        |
| `index.ts`          | barrel                                                      |

## Conventions

- 검증 순서 고정: loopback host(403) → token(401) → POST origin(403) → POST content-type(415).
- host/origin 검증이 DNS rebinding 을 토큰 유출과 무관하게 차단.
- `expectedToken` 미제공 시 토큰 검증 skip; `allowedContentTypes` 기본 `application/json`.
- verdict 는 discriminated union — `ok:false` 일 때만 status/code/message 존재.

## Boundaries

### Always do

- loopback Host 를 항상 최우선 검증.
- 거부 시 status + machine-readable code 를 함께 반환.

### Ask first

- 검증 순서·상태코드·code 값 변경(다중 소비자 계약).

### Never do

- 함수 내부에서 응답 전송(`ServerResponse` 접근 금지).
- 정규식을 우회하는 host/origin 허용.

## Dependencies

- `../token/verifyToken.js` (timing-safe 토큰 비교).
