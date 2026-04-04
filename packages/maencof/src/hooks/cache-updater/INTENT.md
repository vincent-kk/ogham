# cache-updater

## Purpose

PostToolUse 훅. MCP 도구 사용 후 턴 컨텍스트 캐시 갱신.

## Boundaries

### Always do

- MAENCOF_MCP_TOOLS 목록 기반 필터링
- turn-context-builder로 컨텍스트 재구성

### Ask first

- 필터링 대상 도구 목록 변경

### Never do

- 캐시 갱신 전략 변경
