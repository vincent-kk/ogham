## Purpose

Jira / Confluence 인증 설정 상태를 보고하고 선택적으로 연결을 테스트하는 MCP 툴 핸들러 모듈.

## Conventions

미설정은 정상 보고 대상이다. 연결 점검 여부와 자격증명 비노출은 독립된 계약이다.

## Boundaries

### Always do

- 설정·자격증명은 각각 소유한 기반 모듈에서 로드한다 — 도구가 저장 형식을 중복 소유하지 않는다
- 연결 테스트는 `core/connectionTester`의 `testConnection`에 위임한다
- `AuthCheckResult` 타입으로 응답을 반환한다

### Ask first

- 지원 서비스 목록 변경 (`jira`, `confluence` 외 추가)
- 응답 스키마(`AuthCheckResult`) 구조 변경

### Never do

- Atlassian REST API를 직접 호출하지 않는다 (`testConnection` 경유 필수)
- 자격증명 값을 응답에 포함하지 않는다
- 도메인 비즈니스 로직(이슈 조회, 페이지 생성 등)을 포함하지 않는다
