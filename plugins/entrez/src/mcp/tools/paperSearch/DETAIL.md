# paperSearch — Contract

## Requirements

- agent 가 만든 `QueryRole` 다중 검색식을 받아 **누락 0** 의 결정론 union 을 만드는 것이 이 도구의 목적이다.
- 쿼리마다 lint → count → segment → id 수집 순서를 지킨다. 10,000 상한을 넘으면 segmenter 가 분할한다.
- 메타데이터 수집은 배치로 하며 일부 실패를 전체 실패로 만들지 않는다(부분 복구).
- 동기 응답 시간을 넘길 규모는 async job 으로 전환한다(start → status → results).
- 결과에는 `SearchManifest` 를 남긴다 — 어떤 검색식이 어떤 레코드를 맞혔는지 재현 가능해야 한다.

## API Contracts

- `runPaperSearch(...)` — 동기 오케스트레이션 진입점.
- `operations/executeQuery.ts` — 쿼리별 lint→count→segment→id 수집.
- `operations/fetchMetadata.ts` — union pmid 배치 메타 수집과 부분 복구.
- `operations/writeManifest.ts` — `SearchManifest` 생성·영속.
- `operations/{startJob,pollJob,readJob}.ts` — async job 트리오.
- `operations/jobLocation.ts` — job 경로 해석.

## Acceptance Criteria

### AC-search-no-loss — 누락 0

- 여러 검색식의 결과가 union 되고 어떤 레코드도 병합 과정에서 사라지지 않는다.
- `Count` 가 10,000 을 넘는 검색식은 분할되어 전수가 수집된다.

### AC-search-partial-recovery — 부분 복구

- 메타데이터 배치 일부가 실패해도 나머지 결과가 반환된다.

### AC-search-manifest — 재현 가능성

- 결과에 각 레코드의 출처 검색식(`hit_by`)이 남는다.

### AC-search-async — 대량 처리

- async job 은 `start` 이후 `status` 로 진행률을, `results` 로 cursor 페이지를 제공한다.

## Last Updated

2026-07-30 — union 검색 도구 계약을 문서화했다.
