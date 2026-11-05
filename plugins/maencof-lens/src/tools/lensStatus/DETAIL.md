# lensStatus — Contract

## Requirements

- 노드·건강 상태 집계는 maencof, 만료 판정은 staleDetector가 소유한다. 이 경계에서 집계나 마커 비교를 다시 구현하지 않는다.
- legacy 마이그레이션과 일반 갱신은 필요한 조치가 다르므로 경고를 구분한다. 최신 인덱스에는 만료 경고를 붙이지 않는다.
- 읽기 전용 표시와 재색인 안내는 만료 여부와 무관하게 제공한다. 소비자가 렌즈에서 재구축을 시도하지 않게 한다.
- 문서 본문 없는 인덱스 집계에는 레이어 필터를 적용하지 않는다. 만료를 감지해도 보고까지만 수행한다.

## API Contracts

- 그래프 부재도 보고할 상태다. maencof의 상태 결과에 읽기 전용 안내를 더하며 그래프 없음 자체로 예외를 만들지 않는다.

## Acceptance Criteria

### AC-stale-warning-kinds — 만료 종류 구분

- legacy 마커로 판정되면 v1 스키마 마이그레이션을 지목하는 경고가 나온다.
- 일반 만료면 `staleSince` 값을 담은 갱신 경고가 나온다.
- 만료가 아니면 `staleWarning` 필드가 없다.

### AC-read-only-marker — 읽기 전용 표시

- 만료 여부와 무관하게 응답에 `readOnly: true` 와 재색인 안내 `message` 가 있다.

### AC-no-reindex — 재색인 미실행

- 만료를 감지해도 인덱스 재생성이나 볼트 쓰기가 일어나지 않는다.
- 만료 판정이 `detectStale` 한 경로만 거친다.

## Last Updated

집계 위임·만료 경고·읽기 전용 표시 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
