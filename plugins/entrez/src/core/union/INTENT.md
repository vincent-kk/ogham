## Purpose

다중 검색식 결과의 **결정론 합집합(union)**. 복합키 dedup(PMID→DOI→정규화 title) + `hit_by`·`query_role` 누적. 누락 0 보장은 LLM이 아닌 이 모듈의 책임.

## Structure

| 파일                           | 역할                                                 |
| ------------------------------ | ---------------------------------------------------- |
| `operations/mergeRecords.ts`   | `mergeRecords` — 복합키 dedup·attribution 누적(메인) |
| `operations/dedupKey.ts`       | `dedupKey` — PMID→DOI→정규화 title 우선순위 키       |
| `operations/normalizeTitle.ts` | `normalizeTitle` — NFKD·소문자·영숫자만              |
| `operations/tagHitBy.ts`       | `tagHitBy` — hit_by/query_role 병합·결측 필드 보강   |

## Conventions

- 순수 함수(네트워크·I/O 없음). 첫 등장 순서 보존.
- 병합 시 레코드를 **제거하지 않는다**(attribution만 누적).

## Boundaries

### Always do

- dedup은 복합키 우선순위(PMID>DOI>title)를 정확히 따른다.
- 충돌 병합 시 더 완전한 필드값을 보존.

### Ask first

- dedup 키 우선순위·정규화 규칙 변경(재현성 영향).

### Never do

- 상위 레이어 import. 레코드 삭제·LLM 호출. 인라인 문자열 리터럴.

## Dependencies

- `../../types/record` — `PaperRecord`
- `../../types/search` — `UnionResult`
- `../../types/enums` — `QueryRole`
