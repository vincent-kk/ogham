## Purpose

MCP 도구가 서비스하는 브라우저 측 UI 페이지의 컨테이너. 각 하위 페이지는 독립 fractal로 관리된다.

## Conventions

정적 UI의 빌드 입력이며 빈 TypeScript 배럴은 런타임 export를 뜻하지 않는다. 서빙은 로컬 HTTP 도구가 맡는다.

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
- 이 컨테이너 디렉토리에 구현 .ts 배치 (엔트리 표식 `index.ts` 는 예외)
