[filid:lang:ko]

## Purpose

Atlassian URL을 검사해 Cloud/Server 환경을 판별하고, API 버전 선택에 필요한 메타데이터를 제공한다.

## Structure

| 파일 | 역할 |
|---|---|
| `environment-resolver.ts` | `resolveEnvironment`, `getApiVersion` 구현, `EnvironmentInfo` 타입 정의 |
| `index.ts` | 배럴 재내보내기 (타입 포함) |

## Boundaries

### Always do

- `CLOUD_HOSTNAME_PATTERN` 정규식으로만 Cloud 여부를 판별한다.
- `resolveEnvironment`는 URL 후행 슬래시를 제거해 정규화된 `base_url`을 반환한다.
- `getApiVersion`은 `is_cloud` 불리언만 입력받아 `"3"` 또는 `"2"`를 반환한다.
- `EnvironmentInfo` 타입을 index.ts에서 함께 재내보내어 소비자가 직접 import하도록 한다.

### Ask first

- `CLOUD_HOSTNAME_PATTERN` 패턴 변경 (새 클라우드 도메인 추가 등).
- API 버전 매핑(`is_cloud → "3"`, `!is_cloud → "2"`) 변경.

### Never do

- mcp/ 레이어에서 import하지 않는다 (단방향: mcp → core).
- 네트워크 요청이나 파일 I/O를 수행하지 않는다 (순수 동기 함수 유지).
- URL 검증 이외의 비즈니스 로직을 이 모듈에 추가하지 않는다.

## Dependencies

| 대상 | 이유 |
|---|---|
| `../../constants/` | `CLOUD_HOSTNAME_PATTERN` |
| `../../utils/` | `extractHostname` |
