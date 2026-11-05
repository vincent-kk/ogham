# httpClient — Contract

## Requirements

- NCBI 로 나가는 모든 요청은 이 모듈을 통과한다 — 다른 곳에서 `fetch` 를 직접 부르지 않는다.
- 모든 URL 은 전송 전 allowlist 검증을 통과한다. 사설 IP 와 경로 traversal 은 거부한다.
- 429 는 5xx·네트워크 오류와 별개의 재시도 예산을 쓴다. `Retry-After` 가 있으면 그 값을 따른다.
- `tool`·`email`·`api_key` 는 요청마다 주입한다. `api_key` 는 로그·응답 어디에도 노출하지 않는다.
- 의존은 전부 `HttpDeps` 로 주입한다 — NCBI HTTP 를 모킹하는 지점은 이 한 곳뿐이다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-ssrf-guard — 외부 요청 차단선

- allowlist 밖 호스트는 거부된다.
- 사설 IP 대역과 traversal 을 포함한 URL 은 거부된다.

### AC-credential-secrecy — 자격증명 비노출

- `api_key` 가 로그와 반환 값에 나타나지 않는다.

## Last Updated

전송 차단선·자동 POST·재시도 예산과 비밀 보호 계약이 바뀔 때 갱신한다.
