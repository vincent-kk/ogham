# staleDetector — Contract

## Requirements

- 인덱스가 원본보다 뒤처졌는지 판정만 하며 재색인은 수행하지 않는다. 읽기 전용 렌즈에서 볼트 상태를 변경하지 않기 위함이다.
- graph-meta 마커를 우선하고 구형 index는 legacy 라벨에만 사용한다. 이를 fresh로 보고하면 v1 스키마를 최신으로 오인한다.
- 마커 탐색은 `findIndexMarker` 한 경로에 모아 훅과 상태 도구가 서로 다른 기준을 쓰지 않게 한다.
- 훅 경로의 의존을 좁히기 위해 maencof에서는 `CACHE_FILES` 상수만 사용한다. 함수·클래스와 외부 npm 패키지는 들이지 않고 Node 파일시스템·경로 API로 한정한다.

## API Contracts

- 신선도는 마커와 마크다운의 mtime에 근거한다. 마커 부재와 legacy 상태를 최신으로 단정하지 않는다.

## Acceptance Criteria

### AC-stale-detection — 신선도 판정

- 볼트 마크다운이 마커보다 새로우면 stale 로 판정된다.
- 마커가 없으면 최신으로 단정하지 않는다.
- 판정 과정에서 볼트나 인덱스에 쓰기가 없다.

### AC-marker-priority — 마커 우선순위

- `GRAPH_META` 가 있으면 그것을 기준으로 삼는다.
- `INDEX` 만 있으면 legacy 라벨로 분리해 보고하고 fresh 로 취급하지 않는다.
- 탐색이 `findIndexMarker` 한 경로만 거친다.

## Boundary Exemptions

### staleDetector.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: allowed
- **Reason**: SessionStart 훅은 esbuild 번들로 배송되고 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 들어와 가드를 넘긴다.

## Last Updated

마커 우선순위·신선도 판정·훅 의존 경계의 내용이나 적용 범위가 바뀔 때 갱신한다.
