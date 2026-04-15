## Purpose

MCP 도구가 서비스하는 브라우저 측 UI 페이지의 컨테이너.
각 하위 페이지는 독립 fractal로 관리된다.

## Structure

| 디렉토리 | 역할 |
|---|---|
| `setup/` | 인증·연결 설정 UI 페이지 (별도 INTENT.md 보유) |

## Boundaries

### Always do

- 각 페이지를 독립 sub-fractal로 분리하여 INTENT.md 유지
- 페이지는 MCP 도구 핸들러가 서비스하는 정적 UI에 한정

### Ask first

- 새 UI 페이지 추가 (mcp/ 레이어 범위 확장 여부 확인)
- 페이지에서 core/ 모듈 직접 참조

### Never do

- Jira·Confluence 도메인 지식을 페이지 로직에 포함
- mcp/ 레이어를 우회하여 core/ 레이어에 직접 의존
- 이 컨테이너 디렉토리에 .ts 파일을 직접 배치

## Dependencies

- 없음 (컨테이너 역할, 의존성은 각 하위 페이지가 선언)
