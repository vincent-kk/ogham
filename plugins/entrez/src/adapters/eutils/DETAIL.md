# eutils — Contract

## Requirements

- E-utility 하나에 파일 하나다. 각 어댑터는 `operations/` 안에 있고 배럴만이 외부 경계다.
- 모든 HTTP 는 `httpRequest`(DI deps) 를 거친다 — 직접 `fetch` 를 부르지 않는다.
- 각 어댑터는 `fn(args, deps)` 형태의 호출 함수와 `parseXxx(text)` 순수 파서를 함께 노출한다. 파서는 네트워크 없이 fixture 로 검증된다.
- 응답은 도메인 타입으로 변환해 돌려준다 — 원시 XML·JSON 을 상위로 흘리지 않는다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-parser-purity — 파서 순수성

- 모든 `parseXxx` 가 네트워크 없이 fixture 문자열만으로 검증된다.

### AC-http-single-path — HTTP 단일 경로

- `operations/` 안 어떤 파일도 `fetch` 를 직접 호출하지 않는다.

## Last Updated

E-utilities 파서 분리와 응답 도메인 변환 계약이 바뀔 때 갱신한다.
