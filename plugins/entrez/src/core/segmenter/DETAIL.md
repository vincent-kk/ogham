# segmenter — Contract

## Requirements

- ESearch 의 10,000 UID 상한을 우회하는 것이 이 모듈의 존재 이유다. `Count > 10000` 이면 날짜(dp/edat/crdt) 버킷으로 재귀 분할해 전수를 확보한다.
- 버킷은 비중첩 완전 분할이다 — 누락도 중복도 만들지 않는다.
- 빈 버킷은 건너뛴다. 최대 깊이를 넘어도 여전히 상한을 넘는 버킷만 `capped: true` 로 표시한다.
- 네트워크는 `CountFn` 으로 주입한다 — 이 모듈은 NCBI 를 직접 호출하지 않는다.

## API Contracts

- `planSegments(options: SegmentPlanOptions)` — 재귀 분할 진입점. `countFn` 주입 필수.
- `bucketByDate(...): DateBucket[]` — 날짜 범위를 비중첩 연속 버킷으로 나눈다.
- `probeCount(...)` — 버킷별 Count 재조회. 관련 타입: `CountFn`, `CountRange`.

## Acceptance Criteria

### AC-segment-partition — 완전 분할

- 생성된 버킷들이 원 범위를 빈틈없이 덮고 서로 겹치지 않는다.
- 빈 버킷은 결과에 포함되지 않는다.

### AC-segment-cap-marking — 상한 표시

- 최대 깊이에서도 상한을 넘는 버킷만 `capped: true` 를 갖는다.

### AC-segment-purity — 주입 경계

- 모듈이 네트워크를 직접 호출하지 않고 주입된 `countFn` 만 쓴다.

## Last Updated

2026-07-30 — UID 상한 우회 분할 계약을 문서화했다.
