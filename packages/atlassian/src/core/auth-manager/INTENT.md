[filid:lang:ko]

## Purpose

Jira/Confluence 자격증명의 JSON 파일 기반 저장·로드와 HTTP 인증 헤더 조립을 담당한다.

## Structure

| 파일 | 역할 |
|---|---|
| `auth-manager.ts` | `loadCredentials`, `saveCredentials`, `getAuthHeader` 구현 |
| `index.ts` | 배럴 재내보내기 |

## Boundaries

### Always do

- `loadCredentials` / `saveCredentials`를 통해서만 자격증명 파일에 접근한다.
- `buildAuthHeader`(utils)를 사용해 헤더 값을 조립하고, 완성된 헤더 문자열만 반환한다.
- types/의 `AuthType`, `Credentials` Zod 스키마로 유효성을 검증한다.
- index.ts 배럴을 통해서만 외부에 심볼을 노출한다.

### Ask first

- 자격증명 저장 포맷(JSON 외 형식) 또는 저장 경로 정책 변경.
- 새로운 인증 방식(OAuth 등) 추가.

### Never do

- mcp/ 레이어에서 import하지 않는다 (단방향: mcp → core).
- 원시 자격증명(토큰·패스워드 문자열)을 이 모듈 밖으로 노출하지 않는다.
- `getAuthHeader` 외부에서 `loadCredentials` 결과를 직접 직렬화하지 않는다.

## Dependencies

| 대상 | 이유 |
|---|---|
| `../../types/` | `AuthType`, `Credentials` 타입 |
| `../../constants/` | `CREDENTIALS_PATH` 기본 경로 |
| `../../lib/file-io` | `readJson`, `writeJson` |
| `../../utils/` | `buildAuthHeader` |
