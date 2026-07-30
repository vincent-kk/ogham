# httpClient — Contract

## Requirements

- NCBI 로 나가는 모든 요청은 이 모듈을 통과한다 — 다른 곳에서 `fetch` 를 직접 부르지 않는다.
- 모든 URL 은 전송 전 allowlist 검증을 통과한다. 사설 IP 와 경로 traversal 은 거부한다.
- id 개수가 200 을 넘거나 URL 이 2000자를 넘으면 GET 대신 POST 로 전환한다.
- 429 는 5xx·네트워크 오류와 별개의 재시도 예산을 쓴다. `Retry-After` 가 있으면 그 값을 따른다.
- `tool`·`email`·`api_key` 는 요청마다 주입한다. `api_key` 는 로그·응답 어디에도 노출하지 않는다.
- 의존은 전부 `HttpDeps` 로 주입한다 — NCBI HTTP 를 모킹하는 지점은 이 한 곳뿐이다.

## API Contracts

- `httpRequest(...)` — 주입·method 결정·SSRF 검증·재시도를 묶은 단일 진입점.
- `validateUrl(...)` — allowlist·사설 IP·traversal 검증. 위반은 거부.
- `decideMethod(...)` — id 개수와 URL 길이로 GET/POST 를 정한다.
- `computeBackoffMs(...)` · `parseRetryAfterMs(...)` — 429 백오프 계산.
- `withRetry(...)` — 5xx·네트워크와 429 에 서로 다른 예산을 적용한다. 관련 타입: `AttemptOutcome`, `RetryPolicy`.

## Acceptance Criteria

### AC-ssrf-guard — 외부 요청 차단선

- allowlist 밖 호스트는 거부된다.
- 사설 IP 대역과 traversal 을 포함한 URL 은 거부된다.

### AC-auto-post — 자동 POST 전환

- id 200개 초과 또는 URL 2000자 초과에서 POST 로 전환된다.

### AC-retry-budget — 재시도 예산 분리

- 429 재시도가 5xx 예산을 소모하지 않는다.
- `Retry-After` 헤더가 있으면 계산된 백오프보다 우선한다.

### AC-credential-secrecy — 자격증명 비노출

- `api_key` 가 로그와 반환 값에 나타나지 않는다.

## Last Updated

2026-07-30 — 외부 HTTP 단일 통로의 계약을 문서화했다.
