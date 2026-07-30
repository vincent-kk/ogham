# authManager — Contract

## Requirements

- 자격증명의 파일 기반 저장·로드와 HTTP 인증 헤더 조립을 담당한다.
- 자격증명 파일 접근은 `loadCredentials`·`saveCredentials` 를 통해서만 한다.
- 헤더 값 조립은 `utils` 의 `buildAuthHeader` 에 위임하고, 이 모듈은 **완성된 헤더 문자열만** 돌려준다. 호출자가 헤더를 직접 조합하지 않는다.
- 원문 자격증명은 이 모듈 밖으로 나가지 않는다. `getAuthHeader` 밖에서 `loadCredentials` 결과를 직렬화하지 않는다.
- 유효성은 `types/` 의 `AuthType`·`Credentials` Zod 스키마로 검증한다.
- Win32 에서 `chmod 0o600` 은 no-op 이며 파일 보호는 상위 디렉터리의 NTFS ACL 이 담당한다.
- 자격증명이 없거나 형식이 맞지 않으면 헤더 대신 실패를 알린다 — 빈 헤더로 요청을 보내지 않는다.

## API Contracts

- `loadCredentials(...)` — 저장된 자격증명 로드.
- `saveCredentials(...)` — 자격증명 기록.
- `getAuthHeader(...)` — 인증 헤더 조립. 자격증명이 유효하지 않으면 헤더를 만들지 않는다.

## Acceptance Criteria

### AC-single-header-source — 헤더 단일 출처

- `authManager` 밖에서 인증 헤더 문자열을 조립하는 코드가 없다.

### AC-credential-containment — 자격증명 격리

- 원문 자격증명이 도구 응답·로그에 나타나지 않는다.

### AC-missing-credential — 자격증명 부재 처리

- 자격증명이 없으면 헤더를 만들지 않고 호출자가 실패를 인지할 수 있게 답한다.

## Last Updated

2026-07-30 — 자격증명 저장과 헤더 조립 계약을 문서화했다.
