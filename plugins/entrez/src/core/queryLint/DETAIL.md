# queryLint — Contract

## Requirements

- 검색식을 실행 전에 검증한다. 괄호·대괄호의 짝과 중첩 오류는 `error`, recall 을 떨어뜨리는 패턴은 `warning` 이다.
- 따옴표 구문과 wildcard(`*`)는 PubMed 의 ATM 과 MeSH explosion 을 무력화하므로 경고 대상이다 — 문법 오류가 아니라 recall 위험이다.
- `ok` 는 `error` 등급 이슈가 하나도 없을 때만 참이다.
- 순수 함수다 — 네트워크·I/O·상태가 없다.
- 코드와 메시지는 로컬 `as const` 객체로만 정의한다.

## API Contracts

- `lintQuery(query: string)` — 두 검사를 통합하고 `ok` 를 산정하는 진입점.
- `checkParens(query)` — 스택 기반 괄호·대괄호 짝과 중첩 검증(`error`).
- `checkFieldTags(query)` — 따옴표 구문·wildcard recall 저하 경고(`warning`).

## Acceptance Criteria

### AC-paren-balance — 괄호 검증

- 짝이 맞지 않는 괄호·대괄호는 `error` 로 보고된다.
- 잘못 중첩된 경우도 `error` 다.

### AC-recall-warning — recall 경고

- 따옴표 구문과 wildcard 는 `warning` 이며 `ok` 를 거짓으로 만들지 않는다.

## Last Updated

2026-07-30 — 검색식 사전 검증 계약을 문서화했다.
