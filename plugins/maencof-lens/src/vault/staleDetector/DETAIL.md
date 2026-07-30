# staleDetector — Contract

## Requirements

- 볼트 인덱스가 원본보다 뒤처졌는지 판정한다. 판정만 하고 재색인을 실행하지 않는다 — 이 패키지는 읽기 전용이다.
- 판정은 마커 파일의 mtime 을 볼트 마크다운의 최신 mtime 과 비교하는 것이다.
- 마커 우선순위는 `CACHE_FILES.GRAPH_META` 가 먼저이고 `CACHE_FILES.INDEX` 는 **legacy v1 라벨 전용**이다. **legacy 마커를 fresh 로 보고하지 않는다** — 그러면 v1 스키마를 최신으로 오인한다.
- 마커 탐색의 단일 진입점은 `findMarker.ts` 의 `findIndexMarker` 다.
- 훅 경로에서 쓰이므로 의존을 좁게 유지한다: `node:fs`·`node:path` 빌트인과 `@ogham/maencof` 의 **상수 `CACHE_FILES` 만** 쓴다. 그 패키지의 함수·클래스를 import 하지 않고 외부 npm 패키지도 쓰지 않는다.

## API Contracts

- `detectStale(...): StaleInfo` — 인덱스 신선도 판정 결과.
- `findIndexMarker(...)` — 마커 탐색의 단일 진입점(내부).

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

2026-07-30 — 신선도 판정 계약과 훅 직접 import 면책을 문서화했다.
