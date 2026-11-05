# meshLookup — Contract

## Requirements

- 자연어 용어를 MeSH 어휘(Descriptor·entry term·scopeNote)로 매핑한다. 이 결과가 agent 의 검색식 생성과 explosion 판단 재료다.
- 매핑에 실패한 용어는 throw 하지 않고 `matched: NONE` 으로 결과에 남긴다 — 없는 용어를 있는 것처럼 만들지도, 전체 조회를 실패시키지도 않는다.
- MeSH ESummary 의 필드명 가정은 방어적으로 파싱한다. 필드 구조가 바뀌어도 조회 전체가 무너지지 않아야 한다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-mesh-mapping — 어휘 매핑

- 매칭된 용어에 Descriptor 와 entry term 이 함께 돌아온다.
- 매칭 실패 용어는 `matched: NONE` 으로 결과에 남고 예외를 던지지 않는다.

## Last Updated

MeSH 매핑 부재 처리와 응답 필드 가정이 바뀔 때 갱신한다.
