# shared — Contract

## Requirements

- 도구 응답 형식을 한곳에서 정한다 — 핸들러는 평문 데이터를 반환하고 직렬화는 이 모듈이 한다.
- 핸들러 throw 는 서버를 죽이지 않고 에러 봉투가 된다.
- 설정이 필요한 조회 도구는 공통 실행 컨텍스트로 config·credentials 로드와 HttpDeps 조립을 모은다. 미설정 진단과 설정 복구는 컨텍스트 생성을 전제하지 않아야 사용자가 초기 설정으로 진입할 수 있다.
- api_key 는 컨텍스트 안에서만 살고 응답·로그로 나가지 않는다. 실수로 컨텍스트를 JSON 응답에 넣어도 값이 유출되지 않도록 조립된 컨텍스트의 JSON 표현에서는 credentials 와 deps 의 apiKey 를 제외한다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-shared-envelope — 응답 봉투 일관성

- 모든 도구 응답이 같은 봉투 형태를 갖는다.
- 핸들러 예외가 밖으로 전파되지 않는다.

### AC-context-assembly — 컨텍스트 단일 조립

- 설정이 필요한 조회 도구는 buildToolContext를 사용한다. auth_check는 미설정 상태도 보고해야 하므로 config·credentials를 직접 읽는 예외다.
- 조립된 컨텍스트를 직렬화해도 `api_key` 값이 나타나지 않는다.

## Last Updated

응답 직렬화와 실행 컨텍스트·비밀 격리 계약이 바뀔 때 갱신한다.
