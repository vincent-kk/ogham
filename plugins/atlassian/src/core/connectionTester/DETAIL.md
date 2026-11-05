# connectionTester — Contract

## Requirements

- 인증 헤더 생성이 실패하면 요청을 보내지 않고 즉시 실패 결과를 돌려준다.
- 성공·실패 구분과 레이턴시(ms)를 항상 결과에 담는다.
- 응답 본문은 `include_body` 가 명시된 경우에만 포함한다.
- 연결 테스트 외의 데이터 변경 요청(POST/PUT)을 하지 않는다.
- 형제 fractal 은 각자의 배럴로 직접 경유한다 — `core` 부모 배럴은 이 모듈을 재노출하므로 그 경로는 순환이다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-endpoint-selection — 엔드포인트 선택

- Jira Cloud 는 `/rest/api/3/myself`, Jira Server 는 `/rest/api/2/myself` 를 쓴다.
- Confluence Cloud 는 `/wiki/rest/api/space?limit=1`, Server 는 `/rest/api/space?limit=1` 을 쓴다.
- `api_version_override` 가 주어지면 on-prem 에서도 그 버전 경로를 쓴다.

### AC-auth-failure-short-circuit — 인증 실패 조기 종료

- 인증 헤더를 만들 수 없으면 요청 없이 `success: false` 로 끝난다.
- 401 응답은 인증 실패 메시지로 보고된다.

### AC-result-shape — 결과 형태

- 성공 여부와 양수 레이턴시가 항상 포함된다.
- 네트워크 오류는 예외가 아니라 `success: false` 결과가 된다.

## Last Updated

연결 점검의 엔드포인트·실패 보고·응답 노출 정책이 바뀔 때 갱신한다.
