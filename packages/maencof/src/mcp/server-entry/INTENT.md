# server-entry

## Purpose

esbuild 번들 진입점. MCP 서버를 stdio 모드로 시작.

## Boundaries

### Always do

- bridge/mcp-server.cjs로 번들됨
- startServer() 호출만 수행

### Ask first

- 진입점 로직 변경

### Never do

- 서버 로직 직접 추가
