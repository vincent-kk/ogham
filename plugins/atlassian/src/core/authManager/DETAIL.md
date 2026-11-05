# authManager — Contract

## Requirements

- 자격증명 파일 접근은 `loadCredentials`·`saveCredentials` 를 통해서만 한다.
- 저장된 인증과 저장 전 연결 점검은 같은 `buildAuthHeader`를 사용한다. Basic/Bearer 선택 규칙의 분기를 막기 위해 호출자가 별도 헤더 조립 규칙을 만들지 않는다.
- 원문 자격증명 로드는 설정 편집·저장·연결 점검에 허용한다. 비밀이 프로토콜 밖으로 나가지 않도록 도구 응답·로그에 원문을 직렬화하지 않는다.
- 유효성은 types 계층 의 `CredentialsSchema`로 검증한다.
- Win32 에서 `chmod 0o600` 은 no-op 이며 파일 보호는 상위 디렉터리의 NTFS ACL 이 담당한다.
- 자격증명이 없거나 형식이 맞지 않으면 헤더 대신 실패를 알린다 — 빈 헤더로 요청을 보내지 않는다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-single-header-source — 헤더 단일 출처

- 인증 헤더 값의 조립은 공통 `buildAuthHeader`에만 두고, 저장된 인증과 저장 전 연결 점검에서 재사용한다.

### AC-credential-containment — 자격증명 격리

- 원문 자격증명이 도구 응답·로그에 나타나지 않는다.

### AC-missing-credential — 자격증명 부재 처리

- 자격증명이 없으면 헤더를 만들지 않고 호출자가 실패를 인지할 수 있게 답한다.

## Last Updated

자격증명 저장·검증·헤더 조립 및 플랫폼 보호 계약이 바뀔 때 갱신한다.
