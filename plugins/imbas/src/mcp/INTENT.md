# mcp

## Purpose

imbas MCP 서버. 9개 도구를 registerTool 패턴으로 등록.

## Conventions

description은 호출자가 인자를 고르는 계약이므로 한 문장으로 유지해 런타임 컨텍스트 비용을 제한한다.

## Boundaries

### Always do

- 모든 도구 등록에 server.registerTool() 사용
- description은 1문장 (런타임 컨텍스트 절약)

### Ask first

- 새 도구 추가
- 기존 도구 inputSchema 변경

### Never do

- server.tool() 4-arg 패턴으로 도구 등록 (registerTool만 사용)
- wrapHandler에서 수동 JSON.stringify (toolResult이 처리)
