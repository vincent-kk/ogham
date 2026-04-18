# mcp

## Purpose

imbas MCP 서버. 16개 도구(ping 포함)를 registerTool 패턴으로 등록.

## Structure

- `server.ts` — 서버 생성 + 16개 도구 등록
- `server-entry.ts` — stdio 전송 진입점
- `shared.ts` — toolResult, toolError, wrapHandler 공통 유틸
- `tools/` — 개별 도구 핸들러 (thin wrapper → core/ast)

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
