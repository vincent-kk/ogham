# httpClient — Contract

## Requirements

- 외부 Atlassian REST API 호출의 유일한 진입점이다. 다른 곳에서 `fetch` 를 직접 부르지 않는다.
- 모든 요청 전에 `validateUrl` 로 SSRF 검증을 수행한다.
- 인증 토큰은 `config.auth_header` 로만 주입하고 호출자에게 노출하지 않는다.
- 재시도 대상(429, 5xx)에 exponential backoff 를 적용한다.
- 결과는 `McpResponse` 봉투로 반환한다.
- private IP 는 호출자가 `allow_private_ip` 를 명시적으로 전달했을 때만 허용한다 — 기본은 차단이다.

## API Contracts

- `executeRequest(...)` — 재시도·인증·타임아웃을 묶은 요청 실행. `acceptBinary` 옵션이면 `Accept: */*` 로 협상하고, 응답이 `application/json` 이 아닐 때만 `data` 를 `BinaryResponseBody`(`{ _binary, buffer, contentType }`) 로 감싼다.
- `operations/ssrfGuard` 의 `validateUrl(url, expectedHostname, allowPrivateIp?)` — 프로토콜·호스트명·경로 traversal·private IP 를 검증하고 위반 시 `SSRF: …` 로 throw 한다.

## Acceptance Criteria

### AC-ssrf-protocol-host — 프로토콜·호스트 검증

- `http`/`https` 가 아닌 프로토콜은 `SSRF: Invalid protocol` 로 거부된다.
- 기대 호스트명과 다른 URL 은 `SSRF: Hostname` 으로 거부된다.

### AC-ssrf-traversal — 경로 traversal 차단

- `../` 와 퍼센트 인코딩된 형태(`%2e%2e`, `..%2f`)가 모두 `SSRF: Path traversal` 로 거부된다.
- 연속된 점을 포함한 정상 파일명(`report..final.pdf`)은 통과한다.

### AC-ssrf-private-ip — private IP 정책

- 직접 private IP 접근은 기본적으로 거부된다.
- `allowPrivateIp` 가 참이면 private IP 로 해석되는 호스트명과 직접 private IP 모두 허용된다(on-prem).

### AC-retry-backoff — 재시도

- 429·5xx 에 exponential backoff 가 적용된다.

### AC-accept-binary — 바이너리 봉투

- `acceptBinary` 이면서 content-type 이 `application/json` 이 아닌 2xx 응답만 `{ _binary: true, buffer, contentType }` 로 반환한다.
- `acceptBinary` 여도 `application/json` 응답은 평소대로 파싱해 돌려준다.

### AC-credential-secrecy — 자격증명 비노출

- 인증 토큰이 응답 데이터와 로그에 나타나지 않는다.

## Last Updated

2026-08-28 — `acceptBinary` 바이너리 봉투 계약을 명시했다.
