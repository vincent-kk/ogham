# shared — Contract

## Requirements

- 도구 응답 형식을 한곳에서 정한다 — 핸들러는 평문 데이터를 반환하고 직렬화는 이 모듈이 한다.
- 핸들러 throw 는 서버를 죽이지 않고 에러 봉투가 된다.
- 도구 실행 컨텍스트는 config·credentials 로드와 `HttpDeps` 조립을 한 자리에서 수행한다 — 도구마다 다시 조립하지 않는다.
- `api_key` 는 컨텍스트 안에서만 살고 응답·로그로 나가지 않는다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-shared-envelope — 응답 봉투 일관성

- 모든 도구 응답이 같은 봉투 형태를 갖는다.
- 핸들러 예외가 밖으로 전파되지 않는다.

### AC-context-assembly — 컨텍스트 단일 조립

- 도구가 config·credentials 를 각자 읽지 않고 `buildToolContext` 를 통해 받는다.
- 조립된 컨텍스트를 직렬화해도 `api_key` 값이 나타나지 않는다.

## Last Updated

응답 직렬화와 실행 컨텍스트·비밀 격리 계약이 바뀔 때 갱신한다.
