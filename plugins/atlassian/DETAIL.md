# atlassian — Contract

## Requirements

- Python `mcp-atlassian` 의 네이티브 TypeScript 대체다. Jira·Confluence REST API 를 하나의 플러그인으로 통합한다.
- **범용 MCP 도구는 도메인 지식을 갖지 않는다.** 승인된 도메인 어댑터는 `src/jira/` entry point 만 호출하고 규칙을 직접 소유하지 않는다.
- Cloud 와 Server/DC 차이는 스킬과 MCP 계층에서 흡수한다. agent 와 dispatcher 로 배포 환경 분기를 올리지 않는다.
- Jira·Confluence 교차 도메인 조정은 dispatcher 가 맡는다. agent 끼리 통신하거나 스킬이 다른 스킬을 호출하지 않는다.
- 모든 outbound 요청은 SSRF 검증을 통과한다.
- 자격증명은 응답·로그에 노출하지 않으며 저장 파일은 `0o600` 이다.
- `bridge/` 와 `public/` 은 커밋하는 빌드 산출물이며 손편집하지 않는다.
- `src/version.ts` 와 매니페스트 version 은 생성기만 갱신한다.

## API Contracts

- **MCP 도구 5종**: 범용 `fetch`(HTTP 5메서드 + 포맷 자동 변환), `convert`(로컬 변환), `auth_check`(인증 상태), `setup`(설정 UI)과 도메인 어댑터 `comment_thread`.
- **스킬**: Jira·Confluence 도메인 라우터와 설정·다운로드·미디어 분석.
- **에이전트 3종**: `jira`, `confluence`, `media`.
- **변환 계층**: ADF·Storage XHTML·Wiki Markup ↔ Markdown(순수 로컬, Python 레퍼런스 17개 노드 타입).

## Acceptance Criteria

### AC-domain-knowledge-placement — 도메인 지식 위치

- 범용 MCP 도구·core 에 Jira·Confluence 필드 의미나 워크플로 규칙이 없고, 도메인 어댑터는 `src/jira/` entry point 호출만 한다.
- 배포 환경(Cloud/Server) 분기가 agent 문서에 없다.

### AC-ssrf-coverage — SSRF 전면 적용

- 외부 요청 경로가 `core/httpClient` 하나이고, 그 앞에 `validateUrl` 검증이 있다.

### AC-credential-secrecy — 자격증명 보호

- 도구 응답·로그에 자격증명 값이 없다.
- 자격증명 파일 권한이 `0o600` 이다(Win32 는 상위 디렉터리 ACL 이 담당).

### AC-generated-artifacts — 산출물 규약

- `bridge/`·`public/` 이 커밋되고 손편집 흔적이 없다.
- `version.ts` 와 매니페스트 version 이 생성기 산출과 일치한다.

## Last Updated

2026-08-28 — 도메인 어댑터의 공개 MCP 이름을 `comment_thread` 로 단순화했다.
