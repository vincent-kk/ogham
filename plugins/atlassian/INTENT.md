# atlassian — Jira·Confluence 통합 플러그인

## Purpose

`@ogham/atlassian` 패키지 루트. Python `mcp-atlassian` 의 네이티브 TypeScript 대체. Jira / Confluence REST API 통합 Claude Code 플러그인. Windows 호환성은 [cross-platform metadata](../../.metadata/cross-platform/) 에서 추적.

## Conventions

- 의존성 방향 단방향: dispatcher → agent → skill → MCP → REST API
- skill 은 lazy reference loading — capsule 만 컨텍스트에 적재, 도메인 상세는 필요 시점에 로드
- credentials 는 공통 호스트 경로 resolver 가 정한 플러그인 데이터 디렉토리의 평문 JSON 파일이다. 플러그인이 여러 호스트에서 실행되고 호스트마다 상태 루트가 다르므로 Claude 전용 경로를 고정하지 않는다.

## Boundaries

### Always do

- 빌드 산출물은 생성 명령으로 갱신하고 함께 커밋
- 모든 outbound 요청에 SSRF guard 적용
- ADF / Storage ↔ Markdown 변환은 기존 포팅 로직 재사용

### Ask first

- 새 인증 방식 추가 (Basic / PAT / OAuth 외)
- ADF / Storage 노드 매핑 변경 (Python 원본 정합성)
- credentials 저장 경로 또는 포맷 변경 (마이그레이션 영향)

### Never do

- 생성된 배포 산출물 손편집
- SSRF guard 우회 또는 비활성화
- credentials 를 stdout / log 에 출력
- 생성 버전 파일 직접 수정 (`yarn version:sync` 만)
