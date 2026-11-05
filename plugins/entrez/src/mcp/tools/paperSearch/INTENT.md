## Purpose

`paper_search` 도구. agent의 `QueryRole` 다중 검색식을 받아 **결정론 union**을 만든다(누락 0). 대량은 async job(start/status/results).

## Conventions

- 모든 HTTP는 어댑터(→httpClient) 경유. 코드 단계: query_lint→count_probe→date_segment→fetch_ids→fetch_records→union→partial_recovery.
- attribution(hit_by/query_role)은 stub로 부여 후 `union.mergeRecords`로 누적.

## Boundaries

### Always do

- 10k 초과는 segmenter로 전수 확보. 부분 실패는 격리(partial). manifest 기록.

### Ask first

- cap 전략 기본값·batch 기본값 변경, 재현성 checksum 방식 변경.

### Never do

- LLM이 레코드를 제거하도록 위임. api_key를 출력/manifest에 노출.
