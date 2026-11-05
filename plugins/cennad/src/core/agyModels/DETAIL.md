# agyModels — Contract

## Requirements

- `agy models` CLI 출력을 실행·파싱·캐싱해 사용 가능한 Antigravity canonical model slug 목록을 제공한다. `slug<TAB>표시명` 행은 첫 열만 취하며, settings UI 드롭다운과 provider-status 조회의 단일 소스다.
- 네트워크·OAuth 에 의존하므로 실패는 정상 경로다 — 빈 배열로 graceful degrade 하고 throw 하지 않는다.
- CLI 호출은 `@ogham/cross-platform` 을 경유한다.
- agy의 탭 구분 카탈로그는 표시명과 machine-readable slug를 함께 담으므로 첫 열만 canonical 값으로 삼고, 같은 형태의 저장 cache도 읽기 호환한다.

## API Contracts

- 모델 목록 조회 — 성공 시 canonical model slug 배열, 실패 시 빈 배열. 이전 버전이 저장한 탭 구분 cache도 읽을 때 같은 slug 배열로 정규화한다.

## Acceptance Criteria

검증 코드가 수용 기준을 고정하므로 별도 acceptance group을 선언하지 않는다.

## Last Updated

canonical slug와 cache 읽기 호환·조회 실패 정책의 내용이나 적용 범위가 바뀔 때 갱신한다.
