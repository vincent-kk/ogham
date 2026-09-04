# agyModels — Contract

## Requirements

- `agy models` CLI 출력을 실행·파싱·캐싱해 사용 가능한 Antigravity canonical model slug 목록을 제공한다. `slug<TAB>표시명` 행은 첫 열만 취하며, settings UI 드롭다운과 provider-status 조회의 단일 소스다.
- 네트워크·OAuth 에 의존하므로 실패는 정상 경로다 — 빈 배열로 graceful degrade 하고 throw 하지 않는다.
- CLI 호출은 `@ogham/cross-platform` 을 경유한다.

## API Contracts

- 모델 목록 조회 — 성공 시 canonical model slug 배열, 실패 시 빈 배열. 이전 버전이 저장한 탭 구분 cache도 읽을 때 같은 slug 배열로 정규화한다.

## Acceptance Criteria

### AC-degrade-on-failure — 실패 시 degrade

- CLI 부재·인증 실패·네트워크 오류에서 빈 배열을 돌려주고 예외를 던지지 않는다.

### AC-cache-reuse — 캐시 재사용

- 같은 세션에서 반복 조회가 CLI 를 매번 실행하지 않는다.

### AC-catalog-columns — CLI 카탈로그 열 정규화

- `agy models`의 `slug<TAB>표시명` 출력과 그 형식으로 이미 저장된 cache는 모델별 첫 번째 slug만 반환한다.

## History

- 2026-09-04 — agy 1.1.25가 모델 목록을 탭 구분 두 열로 출력하므로 machine-readable 첫 열을 canonical 값으로 선택하고 기존 cache도 읽기 호환하기로 했다.

## Last Updated

2026-09-04 — 탭 구분 모델 카탈로그와 기존 cache 정규화 계약을 추가했다.
