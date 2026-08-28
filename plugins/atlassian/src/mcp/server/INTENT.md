# server — MCP 서버 생성·도구 등록

## Purpose

MCP 서버 인스턴스를 만들고 도구를 등록·라우팅한다. stdio 트랜스포트로 Claude Code 와 통신하며, 도구의 구현이 아니라 등록과 배선만 소유한다.

## Conventions

- 도구 등록은 `server.registerTool()` 과 Zod 스키마로만 이뤄진다.
- 핸들러는 `wrapHandler` 로 감싸 표준 에러 처리를 보장한다.
- 서비스 분기는 `args.service` 를 우선하고, 없을 때만 endpoint 로부터 추론하는 폴백을 쓴다 — 추론은 최후 수단이지 기본 경로가 아니다.

## Boundaries

### Always do

- `server.registerTool()` 과 Zod 스키마로 도구 등록
- 도구 핸들러는 `wrapHandler` 로 래핑하여 표준 에러 처리 보장
- 서비스는 `args.service` 우선, 없으면 endpoint 추론 폴백으로 분기한 뒤 core 위임

### Ask first

- 새 MCP 도구 추가 (상위 mcp 경계의 "Ask first" 정책 적용)
- 트랜스포트 방식 변경 (stdio 외 HTTP 등)

### Never do

- Jira·Confluence 도메인 지식을 이 모듈에 직접 구현
- 인증 토큰을 도구 응답에 노출
- core 계층을 건너뛰어 외부 API 직접 호출
