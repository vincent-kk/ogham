# httpClient — Contract

## Requirements

- 외부 Atlassian REST API 호출의 유일한 진입점이다. 다른 곳에서 `fetch` 를 직접 부르지 않는다.
- 모든 요청 전에 `validateUrl` 로 SSRF 검증을 수행한다.
- 인증 토큰은 `config.auth_header` 로만 주입하고 호출자에게 노출하지 않는다.
- 재시도는 rate limit, 일시적 서버 장애로 지정한 상태와 네트워크 오류에 한정한다. 영구 오류를 반복 전송하지 않도록 모든 5xx를 일괄 재시도하지 않고, backoff와 대기 상한을 적용한다.
- 결과는 `McpResponse` 봉투로 반환한다.
- private IP 는 호출자가 `allow_private_ip` 를 명시적으로 전달했을 때만 허용한다 — 기본은 차단이다.

## API Contracts

HTTP·네트워크 결과는 `McpResponse`로 반환하지만 전송 전 SSRF 정책 위반은 요청 없이 예외로 거부한다. 바이너리 협상 여부와 JSON 판별에 따른 응답 형태는 HTTP 테스트에서 확인한다.

## Acceptance Criteria

### AC-credential-secrecy — 자격증명 비노출

- 인증 토큰이 응답 데이터와 로그에 나타나지 않는다.

## Last Updated

SSRF·재시도·자격증명 보호와 바이너리 응답 계약이 바뀔 때 갱신한다.
