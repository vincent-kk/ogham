# codexModels — Contract

## Requirements

- `codex debug models` 출력을 실행·파싱·캐싱해 사용 가능한 codex 모델과 각 모델이 광고하는 reasoning effort 집합을 제공한다.
- **모델과 effort 는 항상 짝으로 다룬다.** codex 는 모델이 광고하지 않은 effort 를 다운그레이드하지 않고 API 에러로 거부하기 때문이다.
- settings UI 드롭다운과 `/provider-status` 의 단일 소스다.
- 조회 실패는 빈 결과로 degrade 한다.

## API Contracts

- 모델·effort 조회 — 모델마다 지원 effort 집합을 함께 돌려준다.

## Acceptance Criteria

### AC-model-effort-pairing — 짝 유지

- 반환된 각 모델에 그 모델이 광고한 effort 집합이 함께 들어 있다.
- 광고되지 않은 effort 가 선택지로 노출되지 않는다.

### AC-degrade-on-failure — 실패 시 degrade

- CLI 조회 실패에서 빈 결과를 돌려주고 예외를 던지지 않는다.

## Last Updated

2026-07-30 — codex 모델·effort 짝 계약을 문서화했다.
