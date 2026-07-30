# authCheck — Contract

## Requirements

- 인증 설정 상태를 보고하고, 요청받은 경우에만 실제 연결을 테스트한다.
- 미설정 상태는 실패가 아니라 보고 대상이다 — 설정이 없다는 사실 자체가 답이다.
- 자격증명은 존재 여부만 보고한다. 값도, 마스킹된 값도 응답에 넣지 않는다.
- 연결 테스트는 `core/connectionTester` 에 위임한다.

## API Contracts

- `handleAuthCheck(...)` — 설정 상태와(요청 시) 연결 테스트 결과를 돌려준다.

## Acceptance Criteria

### AC-unconfigured-report — 미설정 보고

- 설정이 없어도 throw 하지 않고 미설정 상태로 응답한다.

### AC-optional-connection-test — 선택적 연결 테스트

- 연결 테스트는 요청받았을 때만 수행된다.

### AC-credential-secrecy — 자격증명 비노출

- 응답에 자격증명 값이 나타나지 않는다.

## Last Updated

2026-07-30 — 인증 상태 점검 계약을 문서화했다.
