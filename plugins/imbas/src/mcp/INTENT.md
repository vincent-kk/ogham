# mcp

## Purpose

imbas MCP 서버. 17개 도구(ping 포함)를 registerTool 패턴으로 등록.

## Structure

- `server/` — 서버 생성 + 17개 도구 등록 (`server/server.ts`)
- `serverEntry/` — stdio 전송 진입점 (`serverEntry/serverEntry.ts`)
- `shared/` — toolResult, toolError, wrapHandler 공통 유틸 (`shared/shared.ts`)
- `tools/` — 개별 도구 핸들러 fractal 노드들 (thin wrapper → core/ast)
- `pages/` — 로컬 서빙 브라우저 페이지 정적 자산 (`settings/` — `open_settings`)

## Boundaries

### Always do

- 모든 도구 등록에 server.registerTool() 사용
- description은 1문장 (런타임 컨텍스트 절약)
- AST 도구에 wrapHandler({ checkErrorField: true }) 적용

### Ask first

- 새 도구 추가
- 기존 도구 inputSchema 변경

### Never do

- server.tool() 4-arg 패턴으로 도구 등록 (registerTool만 사용)
- wrapHandler에서 수동 JSON.stringify (toolResult이 처리)
