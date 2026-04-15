## Purpose

인증 주입, 재시도 로직, SSRF 방어를 갖춘 HTTP 클라이언트.
외부 Atlassian REST API 호출의 유일한 진입점.

## Structure

| 파일 | 역할 |
|---|---|
| `http-client.ts` | `executeRequest` — 재시도·인증·타임아웃 처리 |
| `ssrf-guard.ts` | `validateUrl` — DNS 해석 기반 SSRF 방어 |
| `index.ts` | barrel export |

## Boundaries

### Always do

- 모든 외부 HTTP 호출 전 `validateUrl`로 SSRF 검증 수행
- 인증 토큰을 `config.auth_header`로만 주입하고 호출자에게 노출 금지
- 재시도 대상 상태 코드(429, 5xx)에 exponential backoff 적용
- `McpResponse` 봉투 형식으로 결과 반환

### Ask first

- 허용 프로토콜 변경 또는 SSRF 검증 로직 완화
- 재시도 횟수·딜레이 상수 조정

### Never do

- mcp/ 레이어에서 이 모듈을 직접 import (core/ → mcp/ 방향 금지)
- 인증 자격증명을 응답 데이터나 로그에 노출
- SSRF 검증 우회 또는 private IP 허용

## Dependencies

- `../../types/index.js` — `McpResponse`, `HttpClientConfig`, `RequestOptions`
- `../../constants/index.js` — 재시도·타임아웃 상수
- `../../utils/index.js` — `buildUrl`, `extractHostname`, `isPrivateIp`
- `node:dns/promises` — DNS 해석 (ssrf-guard)
