# shared — Contract

## Requirements

- 도구 응답 형식을 한곳에서 정한다. 핸들러가 봉투를 각자 만들지 않는다.
- 핸들러 throw 는 `wrapHandler` 가 흡수해 표준 오류 응답이 된다 — 예외가 서버를 죽이지 않는다.
- `FetchContext` 조립은 서비스·사이트·인증 헤더·API 버전을 합치는 한 자리다. 도구마다 다시 조립하지 않는다.
- 이 모듈은 HTTP 요청이나 외부 I/O 를 직접 수행하지 않는다. 예외는 `buildFetchContext` 가 설정을 읽는 것뿐이다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-envelope-uniformity — 봉투 통일

- 다섯 도구의 응답이 같은 봉투 형태를 갖는다.
- 핸들러 예외가 표준 오류 응답으로 바뀌고 밖으로 전파되지 않는다.

### AC-context-single-assembly — 컨텍스트 단일 조립

- 사이트별 API 실행 컨텍스트는 `buildFetchContext`로 조립한다. 설정 편집과 전체 사이트 인증 점검은 실행할 단일 사이트가 없으므로 core 로더를 직접 사용하며, 별도 API 실행 컨텍스트를 만들지 않는다.
- 조립 결과를 직렬화해도 자격증명 원문이 나타나지 않는다.

## Last Updated

응답 봉투와 컨텍스트 조립·비밀 격리 계약이 바뀔 때 갱신한다.
