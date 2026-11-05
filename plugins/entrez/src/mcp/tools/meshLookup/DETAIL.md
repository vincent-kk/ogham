# meshLookup — Contract

## Requirements

- 자연어 용어를 MeSH 어휘(Descriptor·entry term·scopeNote)로 매핑한다. 이 결과가 agent 의 검색식 생성과 explosion 판단 재료다.
- 실제 MeSH 매핑이 없는 용어는 `matched: NONE` 으로 반환하고 `error` 필드를 생략한다. NCBI HTTP·네트워크 오류 또는 ESearch·ESummary 응답 파싱 실패는 해당 용어에 `matched: NONE` 과 `error: "MeSH lookup failed"` 를 반환하며 다른 용어의 조회를 계속한다 — 조회 장애를 실제 미매칭과 구분한다.
- MeSH ESummary 의 필드명 가정은 방어적으로 파싱한다. 필드 구조가 바뀌어도 조회 전체가 무너지지 않아야 한다.

## API Contracts

`mappings[]`의 선택 필드 `error?: string`은 용어별 조회 장애만 표시한다. 오류 이유는 고정 문자열 `MeSH lookup failed`이며 원본 예외·응답을 노출하지 않아 자격증명과 외부 응답 내용이 도구 출력에 섞이지 않는다.

## Acceptance Criteria

### AC-mesh-mapping — 어휘 매핑

- 매칭된 용어에 Descriptor 와 entry term 이 함께 돌아온다.
- 실제 미매칭은 `matched: NONE` 이며 `error`가 없다. HTTP·네트워크·응답 파싱 실패는 `matched: NONE` 과 `error`로 결과에 남고 예외를 던지거나 다른 용어의 처리를 중단하지 않는다.

## Last Updated

MeSH 매핑 부재 처리와 응답 필드 가정이 바뀔 때 갱신한다.
