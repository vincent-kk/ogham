# agyModels — Contract

## Requirements

- `agy models` CLI 출력을 실행·파싱·캐싱해 사용 가능한 Antigravity 모델 풀네임 목록을 제공한다. settings UI 드롭다운과 provider-status 조회의 단일 소스다.
- 네트워크·OAuth 에 의존하므로 실패는 정상 경로다 — 빈 배열로 graceful degrade 하고 throw 하지 않는다.
- CLI 호출은 `@ogham/cross-platform` 을 경유한다.

## API Contracts

- 모델 목록 조회 — 성공 시 풀네임 배열, 실패 시 빈 배열.

## Acceptance Criteria

### AC-degrade-on-failure — 실패 시 degrade

- CLI 부재·인증 실패·네트워크 오류에서 빈 배열을 돌려주고 예외를 던지지 않는다.

### AC-cache-reuse — 캐시 재사용

- 같은 세션에서 반복 조회가 CLI 를 매번 실행하지 않는다.

## Last Updated

2026-07-30 — Antigravity 모델 목록 조회 계약을 문서화했다.
