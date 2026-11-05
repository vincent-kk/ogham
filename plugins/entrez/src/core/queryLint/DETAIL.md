# queryLint — Contract

## Requirements

- 검색식을 실행 전에 검증한다. 괄호·대괄호의 짝과 중첩 오류는 `error`, recall 을 떨어뜨리는 패턴은 `warning` 이다.
- 따옴표 구문과 wildcard(`*`)는 PubMed 의 ATM 과 MeSH explosion 을 무력화하므로 경고 대상이다 — 문법 오류가 아니라 recall 위험이다.
- 순수 함수다 — 네트워크·I/O·상태가 없다.
- 코드와 메시지는 로컬 `as const` 객체로만 정의한다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

구체적인 입출력 수락 기준은 해당 모듈 테스트가 고정한다.

## Last Updated

검색 문법 오류와 recall 경고의 분류 정책이 바뀔 때 갱신한다.
