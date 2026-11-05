# codexModels — Contract

## Requirements

- `codex debug models` 출력을 실행·파싱·캐싱해 사용 가능한 codex 모델과 각 모델이 광고하는 reasoning effort 집합을 제공한다.
- **모델과 effort 는 항상 짝으로 다룬다.** codex 는 모델이 광고하지 않은 effort 를 다운그레이드하지 않고 API 에러로 거부하기 때문이다.
- settings UI 드롭다운과 `/provider-status` 의 단일 소스다.
- 조회 실패는 stale 캐시, 정적 모델·effort 집합 순서로 degrade한다. CLI를 조회할 수 없어도 UI에 선택지를 제공하며 예외를 전파하지 않는다.

## API Contracts

- 모델·effort 조회 — 모델마다 지원 effort 집합을 함께 돌려준다.

## Acceptance Criteria

### AC-model-effort-pairing — 짝 유지

- 반환된 각 모델에 그 모델이 광고한 effort 집합이 함께 들어 있다.
- 광고되지 않은 effort 가 선택지로 노출되지 않는다.

### AC-degrade-on-failure — 실패 시 degrade

- CLI 조회 실패에서 stale 캐시를 우선하고, 사용 가능한 캐시가 없으면 정적 모델·effort 집합을 반환하며 예외를 던지지 않는다.

## Last Updated

모델과 effort의 결합·조회 실패 정책의 내용이나 적용 범위가 바뀔 때 갱신한다.
