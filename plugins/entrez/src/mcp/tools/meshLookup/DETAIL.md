# meshLookup — Contract

## Requirements

- 자연어 용어를 MeSH 어휘(Descriptor·entry term·scopeNote)로 매핑한다. 이 결과가 agent 의 검색식 생성과 explosion 판단 재료다.
- 경로는 `db=mesh` 의 ESearch → ESummary 다.
- 매핑에 실패한 용어는 throw 하지 않고 `matched: NONE` 으로 결과에 남긴다 — 없는 용어를 있는 것처럼 만들지도, 전체 조회를 실패시키지도 않는다.
- MeSH ESummary 의 필드명 가정은 방어적으로 파싱한다. 필드 구조가 바뀌어도 조회 전체가 무너지지 않아야 한다.

## API Contracts

- `runMeshLookup(...)` — 용어별 매핑을 수집하는 진입점.
- `operations/lookupTerm.ts` — 단일 용어 매핑(`lookupTerm`)과 요약 파싱(`parseMeshSummary`).

## Acceptance Criteria

### AC-mesh-mapping — 어휘 매핑

- 매칭된 용어에 Descriptor 와 entry term 이 함께 돌아온다.
- 매칭 실패 용어는 `matched: NONE` 으로 결과에 남고 예외를 던지지 않는다.

## Last Updated

2026-07-30 — MeSH 매핑 도구 계약을 문서화했다.
