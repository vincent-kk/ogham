# shared — Contract

## Requirements

- 도구 응답 형식을 한곳에서 정한다. 핸들러가 봉투를 각자 만들지 않는다.
- 핸들러 throw 는 `wrapHandler` 가 흡수해 표준 오류 응답이 된다 — 예외가 서버를 죽이지 않는다.
- `FetchContext` 조립은 서비스·사이트·인증 헤더·API 버전을 합치는 한 자리다. 도구마다 다시 조립하지 않는다.
- 이 모듈은 HTTP 요청이나 외부 I/O 를 직접 수행하지 않는다. 예외는 `buildFetchContext` 가 설정을 읽는 것뿐이다.

## API Contracts

- `helpers/toolResponse` — `toolResult`·`toolError`·`mapReplacer`·`wrapHandler`.
- `helpers/buildFetchContext` — `buildFetchContext(...)`: 설정·인증·환경을 합쳐 `FetchContext` 를 만든다.

## Acceptance Criteria

### AC-envelope-uniformity — 봉투 통일

- 네 도구의 응답이 같은 봉투 형태를 갖는다.
- 핸들러 예외가 표준 오류 응답으로 바뀌고 밖으로 전파되지 않는다.

### AC-context-single-assembly — 컨텍스트 단일 조립

- 도구가 설정·인증을 각자 읽지 않고 `buildFetchContext` 를 통해 받는다.
- 조립 결과를 직렬화해도 자격증명 원문이 나타나지 않는다.

## Last Updated

2026-07-30 — 응답 포맷과 컨텍스트 조립 계약을 문서화했다.
