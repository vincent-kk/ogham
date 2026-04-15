## Purpose

Jira / Confluence 인증 설정 상태를 보고하고 선택적으로 연결을 테스트하는
MCP 툴 핸들러 모듈.

## Structure

| 파일 | 역할 |
|------|------|
| `auth-check.ts` | `handleAuthCheck` — 설정 로드, 자격증명 확인, 연결 테스트 |
| `index.ts` | 배럴 — `handleAuthCheck` 재내보내기 |

## Boundaries

### Always do

- 설정은 `core/config-manager`, 자격증명은 `core/auth-manager`에서 로드한다
- 연결 테스트는 `core/connection-tester`의 `testConnection`에 위임한다
- `AuthCheckResult` 타입으로 응답을 반환한다

### Ask first

- 지원 서비스 목록 변경 (`jira`, `confluence` 외 추가)
- 응답 스키마(`AuthCheckResult`) 구조 변경

### Never do

- Atlassian REST API를 직접 호출하지 않는다 (`testConnection` 경유 필수)
- 자격증명 값을 응답에 포함하지 않는다
- 도메인 비즈니스 로직(이슈 조회, 페이지 생성 등)을 포함하지 않는다

## Dependencies

- `core/config-manager` — 서비스 설정 로드
- `core/auth-manager` — 자격증명 로드
- `core/index` — `testConnection`
- `types/index` — `AuthCheckResult`, `AuthCheckServiceEntry`
