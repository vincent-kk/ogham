[filid:lang:ko]

## Purpose

Jira/Confluence 인스턴스에 실제 HTTP 요청을 보내 연결 가능 여부와 인증 유효성을 검증한다.

## Structure

| 파일 | 역할 |
|---|---|
| `connection-tester.ts` | `testConnection` 구현 (환경 감지 → 엔드포인트 선택 → 요청 실행) |
| `index.ts` | 배럴 재내보내기 |

## Boundaries

### Always do

- `resolveEnvironment`로 Cloud/Server를 판별한 뒤 서비스별 테스트 엔드포인트를 선택한다.
- `buildAuthHeader`로 인증 헤더를 생성하고, 헤더 생성 실패 시 즉시 실패 결과를 반환한다.
- 응답 성공·실패 구분과 레이턴시(ms)를 항상 `ConnectionTestResult`에 포함한다.
- `include_body` 플래그가 명시된 경우에만 응답 본문을 결과에 포함한다.

### Ask first

- 테스트용 엔드포인트 경로(`/myself`, `/space`) 변경.
- `CONNECTION_TEST_TIMEOUT` 기본값 조정.

### Never do

- mcp/ 레이어에서 import하지 않는다 (단방향: mcp → core).
- 자격증명 원문을 `ConnectionTestResult` 밖으로 노출하지 않는다.
- 연결 테스트 외의 데이터 변경 요청(POST/PUT)을 수행하지 않는다.

## Dependencies

| 대상 | 이유 |
|---|---|
| `../../types/` | `ConnectionTestResult`, `HttpClientConfig`, `TestConnectionParams` |
| `../../constants/` | `CONNECTION_TEST_TIMEOUT` |
| `../index` | `resolveEnvironment`, `getApiVersion`, `executeRequest` |
| `../../utils/` | `buildAuthHeader` |
