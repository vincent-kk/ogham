# httpClient — Atlassian REST 아웃바운드 단일 게이트

## Purpose

인증 주입, 재시도, SSRF 방어를 갖춘 HTTP 클라이언트. 외부 Atlassian REST API 호출의 유일한 진입점이며, 다른 계층은 전송을 직접 수행하지 않는다.

## Conventions

- SSRF 방어는 호스트 문자열이 아니라 DNS 해석 결과로 판정한다 — 이름 기반 검사만으로는 rebinding 을 막지 못한다.
- 재시도 대상은 429 와 5xx 뿐이고 지연은 exponential backoff 로 늘린다. 나머지 4xx 는 재시도하지 않는다.
- 성공·실패 모두 `McpResponse` 봉투로 돌려주고 예외를 호출자에게 전파하지 않는다.
- 인증은 `config.auth_header` 한 곳으로만 들어온다 — 호출자가 헤더를 조립하지 않는다.

## Boundaries

### Always do

- 모든 외부 HTTP 호출 전 `validateUrl` 로 SSRF 검증 수행
- 인증 토큰을 `config.auth_header` 로만 주입하고 호출자에게 노출 금지
- 재시도 대상 상태 코드(429, 5xx)에 exponential backoff 적용
- `McpResponse` 봉투 형식으로 결과 반환

### Ask first

- 허용 프로토콜 변경 또는 SSRF 검증 로직 완화
- 재시도 횟수·딜레이 상수 조정

### Never do

- `mcp/` 레이어에서 이 모듈을 직접 import (core → mcp 방향 금지)
- 인증 자격증명을 응답 데이터나 로그에 노출
- 호출자가 `allow_private_ip` 정책을 명시적으로 전달하지 않은 한 private IP 허용
