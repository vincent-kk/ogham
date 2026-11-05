## Purpose

paper_search 도구. agent의 QueryRole 다중 검색식을 받아 결정론 union을 만든다(기본 전략에서 누락 0). 대량 검색은 호출자가 명시적으로 비동기 job을 선택한다.

## Conventions

- 모든 HTTP는 어댑터(→httpClient) 경유. 코드 단계: query_lint→count_probe→date_segment→fetch_ids→fetch_records→union→partial_recovery.
- attribution(hit_by/query_role)은 stub로 부여 후 `union.mergeRecords`로 누적.

## Boundaries

### Always do

- 기본 날짜 분할로 UID 상한을 우회하되 분할 한계와 호출자가 선택한 상한 전략·예산을 명시해 전수 수집을 과장하지 않는다. 메타데이터 부분 실패는 격리하고 manifest를 남긴다.

### Ask first

- cap 전략 기본값·batch 기본값 변경, 재현성 checksum 방식 변경.

### Never do

- LLM이 레코드를 제거하도록 위임. api_key를 출력/manifest에 노출.
