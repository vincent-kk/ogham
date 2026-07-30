# union — Contract

## Requirements

- 여러 검색식의 결과를 합칠 때 레코드를 **제거하지 않는다**. 병합은 attribution 누적이지 필터가 아니다 — 누락 0 보장이 이 모듈의 책임이다.
- dedup 키는 PMID → DOI → 정규화 title 순으로 결정한다.
- title 정규화는 NFKD 분해 후 소문자화하고 영숫자만 남긴다.
- 첫 등장 순서를 보존한다.
- 순수 함수다 — 네트워크와 I/O 가 없다.

## API Contracts

- `mergeRecords(...)` — 복합키 dedup 과 `hit_by`·`query_role` 누적을 수행하는 진입점.
- `dedupKey(record): string` — PMID → DOI → 정규화 title 우선순위 키.
- `normalizeTitle(title): string` — NFKD·소문자·영숫자만.
- `tagHitBy(...)` — `hit_by`/`query_role` 병합과 결측 필드 보강.

## Acceptance Criteria

### AC-union-no-loss — 무손실 병합

- 병합 결과의 고유 레코드 수가 입력 고유 레코드 수보다 작지 않다.
- 같은 논문이 여러 검색식에서 나오면 하나로 합쳐지되 `hit_by` 에 모든 출처가 남는다.

### AC-dedup-key-priority — 키 우선순위

- PMID 가 있으면 DOI·title 과 무관하게 PMID 로 판정한다.
- PMID 가 없고 DOI 가 있으면 DOI 로 판정한다.
- 둘 다 없으면 정규화 title 로 판정한다.

### AC-union-order — 순서 보존

- 결과가 첫 등장 순서를 유지한다.

## Last Updated

2026-07-30 — 결정론 합집합 계약을 문서화했다.
