[filid:lang:ko]

## Purpose

Jira/Confluence 자격증명의 JSON 파일 기반 저장·로드와 HTTP 인증 헤더 조립을 담당한다.

## Conventions

HTTP 호출에는 완성된 헤더를 전달하고, 설정 편집·연결 점검에는 자격증명 로더를 제공한다. 저장 형식·경로 변경은 기존 자격증명 사용에 영향을 준다.

## Boundaries

### Always do

- `loadCredentials` / `saveCredentials`를 통해서만 자격증명 파일에 접근한다.
- 헤더 조립은 `buildAuthHeader`에 모아 저장된 인증과 저장 전 연결 점검의 인증 선택 규칙이 달라지지 않게 한다.
- Validate loaded and saved credentials with `CredentialsSchema`; reject invalid stored values with an error directing callers to run setup again.
- Keep missing files as empty credentials; only setup may recover schema-invalid stored credentials as empty. Validate saves before any write.
- index.ts 배럴을 통해서만 외부에 심볼을 노출한다.
- Win32 에서는 `chmod 0o600` 가 no-op 이며, 호스트 resolver가 선택한 자격증명 부모 디렉토리의 NTFS ACL (기본값: 현재 사용자 전용 상속) 이 파일 보호를 담당함을 호출자에게 README Security 섹션으로 안내한다.

### Ask first

- 자격증명 저장 포맷(JSON 외 형식) 또는 저장 경로 정책 변경.
- 새로운 인증 방식(OAuth 등) 추가.

### Never do

- mcp/ 레이어에서 import하지 않는다 (단방향: mcp → core).
- 원문 자격증명은 설정 편집·저장·연결 점검에만 전달하고 도구 응답이나 로그로 직렬화하지 않는다.
